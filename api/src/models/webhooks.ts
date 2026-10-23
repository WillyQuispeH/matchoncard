import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { config } from '../utils/config';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { EmisorWebhooksClient } from '../utils/emisorWebhooks';
import { VALIDACION_POR_ID } from '../queries/validaciones';
import { DEVOLVER_A_COLA, DOCUMENTO_PARA_WEBHOOK, INSERTAR_WEBHOOK_DOCUMENTO, INSERTAR_WEBHOOK_VALIDACION, MARCAR_ENTREGADO, REPROGRAMAR, RESERVAR_PENDIENTES } from '../queries/webhooks';
import { REPASO_MS, RESERVA_SEGUNDOS, SIN_EMISOR_MINUTOS } from '../data/webhooks';
import { WebhookPendiente } from '../interfaces/webhook';

// Cola de webhooks (tabla webhooks). La API arma el cuerpo, lo firma y lleva los reintentos (1, 2, 4, 8… minutos);
// api-webhook solo hace la llamada HTTP al cliente. Cabecera X-V3P-Firma = "sha256=" + HMAC-SHA256(cuerpo crudo, secreto del cliente).
@Injectable()
export class WebhooksService {
  private log = new Logger('Webhooks');
  private corriendo = false;
  private otraVez = false;

  constructor(private db: DbService, private cripto: CriptoService, private emisor: EmisorWebhooksClient) {}

  async encolar(validacionId: string, evento: string) {
    const r = await this.db.uno(VALIDACION_POR_ID, [validacionId]);
    if (!r || !r.callback_url) return;
    const res = r.resultado || {};
    const cuerpo = {
      evento,
      validacion_id: r.id,
      referencia: r.referencia,
      documento_id: r.documento_id,
      estado: r.estado,
      motivos: r.motivos,
      veredicto_dispositivo: r.veredicto_cliente,
      puntajes: r.resultado ? { huella: res.huella?.probabilidad ?? null, rostro: res.rostro?.probabilidad ?? null, prueba_de_vida: res.rostro?.prueba_de_vida ?? null, firma: res.firma?.parecido ?? null } : null,
      evidencia_sha256: r.evidencia_sha256,
      integridad: r.integridad,
      verificacion_servidor: r.verificacion_servidor,
      fecha: new Date().toISOString(),
    };
    await this.db.uno(INSERTAR_WEBHOOK_VALIDACION, [r.id, r.cliente_id, r.callback_url, cuerpo]);
    this.despertar();
  }

  // Eventos de documentos: documento.firmado | documento.completado | documento.turno | documento.validacion_fallida | documento.cancelado
  async encolarDocumento(documentoId: string, evento: string, extra: Record<string, unknown> = {}) {
    const d = await this.db.uno(DOCUMENTO_PARA_WEBHOOK, [documentoId]);
    if (!d || !d.callback_url) return;
    const cuerpo = { evento, documento_id: d.id, referencia: d.referencia, nombre: d.nombre, estado: d.estado, version: d.version, sha256: d.sha256_actual, ...extra, fecha: new Date().toISOString() };
    await this.db.uno(INSERTAR_WEBHOOK_DOCUMENTO, [d.id, d.cliente_id, d.callback_url, cuerpo]);
    this.despertar();
  }

  // envía en segundo plano, sin demorar a quien encoló; si falla, lo toma el siguiente repaso
  despertar() {
    this.procesar().catch((e) => this.log.error(e.message));
  }

  @Interval(REPASO_MS)
  async procesar(): Promise<void> {
    if (this.corriendo) { this.otraVez = true; return; }   // llegó algo nuevo mientras se enviaba: se repasa al terminar
    this.corriendo = true;
    this.otraVez = false;
    try {
      const lote = await this.db.q<WebhookPendiente>(RESERVAR_PENDIENTES, [config.webhooks.maxIntentos, config.webhooks.lote, String(RESERVA_SEGUNDOS)]);
      let sinEmisor = false;
      for (const w of lote) {
        if (sinEmisor) await this.db.q(DEVOLVER_A_COLA, [w.id, 'api-webhook no disponible', String(SIN_EMISOR_MINUTOS)]);
        else sinEmisor = !(await this.enviar(w));
      }
    } finally {
      this.corriendo = false;
    }
    if (this.otraVez) return this.procesar();
  }

  // false si api-webhook no respondió (el resto del lote vuelve a la cola sin gastar intentos)
  private async enviar(w: WebhookPendiente): Promise<boolean> {
    const crudo = JSON.stringify(w.cuerpo);
    let firma: string;
    try {
      firma = `sha256=${this.cripto.hmac(this.cripto.desenvolver(w.webhook_secreto_cifrado), crudo)}`;
    } catch (e) {
      await this.fallo(w, `secreto de webhook del cliente: ${(e as Error).message}`);
      return true;
    }
    const r = await this.emisor.entregar({ id: w.id, url: w.url, evento: w.cuerpo.evento, cuerpo: crudo, firma });
    if (!r) {
      await this.db.q(DEVOLVER_A_COLA, [w.id, 'api-webhook no disponible', String(SIN_EMISOR_MINUTOS)]);
      this.log.warn(`Webhook ${w.id}: api-webhook no responde, se reintenta en ${SIN_EMISOR_MINUTOS} min`);
      return false;
    }
    if (r.ok) await this.db.q(MARCAR_ENTREGADO, [w.id]);
    else await this.fallo(w, r.error || 'Error desconocido');
    return true;
  }

  private async fallo(w: WebhookPendiente, error: string) {
    const n = w.intentos + 1;
    await this.db.q(REPROGRAMAR, [w.id, n, error.slice(0, 300), String(2 ** (n - 1))]);
    this.log.warn(`Webhook ${w.id} falló (intento ${n}/${config.webhooks.maxIntentos}): ${error}`);
  }
}
