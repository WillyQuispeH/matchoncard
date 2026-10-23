import { ConflictException, GoneException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { config } from '../utils/config';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { AlmacenService } from '../utils/almacen';
import { emitirSesion } from '../middlewares/auth';
import { ABIERTAS } from '../data/estados';
import { ConsentimientoDto, ResultadoDto } from '../schemas/captura';
import { GUARDAR_CONSENTIMIENTO, GUARDAR_OBJETO, GUARDAR_RESULTADO, INICIAR_SESION, VALIDACION_POR_TOKEN } from '../queries/captura';
import { VALIDACION_POR_ID } from '../queries/validaciones';
import { AuditoriaService } from './auditoria';
import { WebhooksService } from './webhooks';
import { DocumentosService } from './documentos';

@Injectable()
export class CapturaService {
  constructor(
    private db: DbService,
    private cripto: CriptoService,
    private almacen: AlmacenService,
    private audit: AuditoriaService,
    private webhooks: WebhooksService,
    private documentos: DocumentosService,
  ) {}

  // El teléfono canjea el token del link por una sesión corta y la clave de cifrado de su evidencia.
  async iniciar(token: string, ip: string, ua: string) {
    const r = await this.db.uno(VALIDACION_POR_TOKEN, [this.cripto.sha256(token)]);
    if (!r) throw new NotFoundException('El enlace no es válido.');
    if (!ABIERTAS.includes(r.estado)) throw new GoneException('Esta validación ya se completó o fue cerrada.');
    const ahora = new Date();
    if (new Date(r.link_expira) < ahora) throw new GoneException('El enlace venció. Pide uno nuevo.');
    if (r.sesion_expira && new Date(r.sesion_expira) < ahora) throw new GoneException('Se acabó el tiempo para completar la validación. Pide un enlace nuevo.');
    const primera = !r.sesion_iniciada_en;
    const expira = primera ? new Date(ahora.getTime() + config.captura.sesionMinutos * 60_000) : new Date(r.sesion_expira);
    if (primera) await this.db.q(INICIAR_SESION, [r.id, expira]);
    await this.audit.registrar(primera ? 'captura.iniciada' : 'captura.reabierta', 'telefono', r.id, ip, { ua: ua.slice(0, 200) });
    const minutos = Math.max(1, Math.ceil((expira.getTime() - ahora.getTime()) / 60_000));
    return {
      validacion_id: r.id,
      sesion: emitirSesion(r.id, minutos),
      expira_en: expira.toISOString(),
      clave: this.cripto.desenvolver(r.dek_envuelta).toString('base64'),
      nombre: r.nombre,
      ya_consentida: r.estado === 'consentida',
      config: {
        responsable: config.responsable.nombre,
        contacto: config.responsable.contacto,
        consentimiento_version: config.responsable.versionConsentimiento,
        retencion_dias: config.retencion.diasAprobada,
        max_bytes: config.captura.maxBytes,
      },
    };
  }

  private async abierta(id: string) {
    const r = await this.db.uno(VALIDACION_POR_ID, [id]);
    if (!r) throw new NotFoundException('Validación no encontrada');
    if (!ABIERTAS.includes(r.estado)) throw new ConflictException('Esta validación ya se cerró.');
    if (r.sesion_expira && new Date(r.sesion_expira) < new Date()) throw new GoneException('Se acabó el tiempo para completar la validación.');
    return r;
  }

  async consentimiento(id: string, dto: ConsentimientoDto, ip: string, ua: string) {
    const r = await this.abierta(id);
    const c = { version: dto.version, texto: dto.texto, texto_sha256: this.cripto.sha256(dto.texto), otorgado_en: dto.otorgado_en, recibido_en: new Date().toISOString(), ip, user_agent: ua.slice(0, 300) };
    await this.db.q(GUARDAR_CONSENTIMIENTO, [r.id, c]);
    await this.audit.registrar('consentimiento.otorgado', 'telefono', r.id, ip, { version: dto.version, texto_sha256: c.texto_sha256 });
    return { ok: true };
  }

  async subida(id: string, bytes: number, ip: string) {
    const r = await this.abierta(id);
    if (r.estado !== 'consentida') throw new ConflictException('Falta el consentimiento del titular.');
    const clave = r.objeto_clave || this.almacen.claveObjeto(r.id);
    const url = await this.almacen.urlSubida(clave, bytes);
    await this.db.q(GUARDAR_OBJETO, [r.id, clave]);
    await this.audit.registrar('evidencia.url_emitida', 'telefono', r.id, ip, { bytes });
    return { url, metodo: 'PUT', cabeceras: { 'Content-Type': 'application/octet-stream' }, expira_en: new Date(Date.now() + config.captura.subidaSegundos * 1000).toISOString() };
  }

  async resultado(id: string, dto: ResultadoDto, ip: string) {
    const r = await this.abierta(id);
    if (r.estado !== 'consentida' || !r.objeto_clave) throw new ConflictException('Primero hay que subir la evidencia.');
    const tam = await this.almacen.tamano(r.objeto_clave);
    if (tam == null) throw new UnprocessableEntityException('No encontramos la evidencia subida. Reintenta la subida.');
    if (tam !== dto.bytes_cifrados) throw new UnprocessableEntityException('La evidencia subida no coincide con la declarada.');

    const motivos: string[] = [];
    // 1) integridad: se descifra en el servidor y se compara el SHA-256 declarado por el teléfono
    let integridad = 'ok';
    try {
      const zip = this.cripto.descifrarEvidencia(await this.almacen.leer(r.objeto_clave), this.cripto.desenvolver(r.dek_envuelta));
      if (this.cripto.sha256(zip) !== dto.evidencia_sha256) { integridad = 'distinta'; motivos.push('hash_distinto'); }
      if (zip.subarray(0, 2).toString('latin1') !== 'PK') { integridad = 'distinta'; motivos.push('no_es_zip'); }
    } catch {
      integridad = 'distinta';
      motivos.push('evidencia_ilegible');
    }
    // 2) el RUN leído de la cédula (OCR frente / MRZ) debe ser el del firmante esperado
    const leidos = (dto.resultado.run_leido || []).map((x) => CriptoService.normalizarRut(x)).filter(Boolean) as string[];
    const esperado = r.rut_hash;
    if (leidos.length && !leidos.some((x) => this.cripto.hashRut(x) === esperado)) motivos.push('run_distinto');
    if (!leidos.length) motivos.push('run_no_leido');

    // 3) estado final: regla de 2 de 3 factores (huella, rostro, firma) correctos.
    //    3/3 → aprobada · 2/3 → revisión (firma "con observaciones") · menos de 2 → rechazada.
    //    El veredicto de cada factor viene del dispositivo (fase 2: re-cálculo en servidor).
    const R = dto.resultado;
    const factores = { huella: R.huella?.nivel, rostro: R.rostro?.nivel, firma: R.firma?.nivel };
    const tieneFactores = Object.values(factores).some((x) => x);
    let estado: string;
    if (tieneFactores) {
      const ok = Object.values(factores).filter((x) => x === 'ok').length;
      estado = ok === 3 ? 'aprobada' : ok === 2 ? 'revision' : 'rechazada';
      for (const [k, v] of Object.entries(factores)) if (v !== 'ok') motivos.push(`${k}_${v === 'bad' ? 'no_coincide' : 'no_confirmada'}`);
      if ((R.huella as any)?.omitida) motivos.push('huella_omitida');
    } else {
      const n = R.nivel;   // clientes antiguos sin detalle por factor
      estado = n === 'ok' ? 'aprobada' : n === 'bad' ? 'rechazada' : 'revision';
    }
    if (motivos.includes('run_distinto')) estado = 'rechazada';
    else if (estado === 'aprobada' && (integridad !== 'ok' || motivos.includes('run_no_leido'))) estado = 'revision';   // una rechazada (menos de 2 de 3) no se "sube" a revisión
    const dias = estado === 'rechazada' ? config.retencion.diasOtras : config.retencion.diasAprobada;

    await this.db.q(
      GUARDAR_RESULTADO,
      [r.id, estado, dto.resultado, dto.resultado.global, dto.evidencia_sha256, dto.bytes_cifrados, integridad, motivos, String(dias)],
    );
    await this.audit.registrar('validacion.finalizada', 'telefono', r.id, ip, { estado, motivos, integridad, manifiesto_sha256: dto.manifiesto_sha256 });
    await this.webhooks.encolar(r.id, 'validacion.finalizada');
    // si la validación era para firmar un documento, se encola la firma (aprobada o en revisión)
    let firma: string | undefined;
    if (r.firmante_id) {
      await this.documentos.alFinalizarValidacion(r.id);
      firma = ['aprobada', 'revision'].includes(estado) ? 'Tu firma se está estampando en el documento.' : 'No pudimos habilitar la firma del documento con esta validación.';
    }
    return {
      documento: firma, validacion_id: r.id, estado, mensaje: estado === 'aprobada' ? 'Validación enviada. Ya puedes volver a tu documento.' : 'Validación enviada. Te avisaremos si hace falta algo más.' };
  }
}
