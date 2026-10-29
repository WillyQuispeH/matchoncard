import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../utils/database';
import { config } from '../utils/config';
import { ESTADO, MOTIVOS } from '../data/informe';
import { FIRMA_PUBLICA } from '../queries/documentos';
import { PanelService } from './panel';
import { OperacionService } from './operacion';
import { InformeService } from './informe';

export type Factor = 'ok' | 'warn' | 'bad' | 'omitida' | null;
// nivel de un factor tal como lo entregó el teléfono ('omitida': el titular siguió sin huella)
export const factor = (f: any): Factor => (f?.omitida ? 'omitida' : f?.nivel ?? null);
// destino del QR de la estampa
export const urlVerificacion = (validacionId: string) => `${config.urlPublica}/verificar/${validacionId}`;
// actor de la auditoría para lo que se consulta desde el QR
export const ACTOR_PUBLICO = 'publico:qr';

// Verificación pública de una firma (a la que lleva el QR de la estampa): resumen y el informe de validación
// completo, el mismo que emite el panel (con las imágenes de la cédula, huella, rostro y firma).
@Injectable()
export class FirmaPublicaService {
  constructor(private db: DbService, private panel: PanelService, private operacion: OperacionService, private informes: InformeService) {}

  private async fila(validacionId: string) {
    const r = await this.db.uno<any>(FIRMA_PUBLICA, [validacionId]);
    if (!r) throw new NotFoundException('No hay una firma registrada con ese identificador');
    return r;
  }

  async resumen(validacionId: string) {
    const r = await this.fila(validacionId);
    const R = r.resultado || {};
    return {
      validacion_id: r.validacion_id as string,
      estado: r.estado as string,
      estado_texto: r.estado === 'revision' ? 'Identidad validada con observaciones' : (ESTADO[r.estado] || [r.estado])[0],
      nombre: r.nombre as string,
      rut: r.rut_mascara as string,
      firmado_en: r.firmado_en as string,
      documento: r.documento as string,
      solicitado_por: r.cliente as string,
      factores: { huella: factor(R.huella), rostro: factor(R.rostro), firma: factor(R.firma) },
      observaciones: ((r.motivos || []) as string[]).map((m) => MOTIVOS[m] || m),
      evidencia_sha256: r.evidencia_sha256 as string | null,
      informe_disponible: !!r.dek_envuelta,
    };
  }

  // Cada descarga emite un informe con folio propio y queda en la auditoría (actor publico:qr).
  async informe(validacionId: string, ip: string) {
    const r = await this.fila(validacionId);
    const cliente = await this.panel.cliente(r.cliente_id);
    const v = await this.panel.detalle(cliente, validacionId, ACTOR_PUBLICO, ip);
    const op = await this.operacion.abrir(cliente.id, validacionId, ACTOR_PUBLICO, ip);   // 410 si la evidencia ya se eliminó
    return this.informes.emitir(v, op, v.historial, ACTOR_PUBLICO, ip);
  }
}
