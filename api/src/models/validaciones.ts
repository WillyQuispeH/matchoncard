import { BadRequestException, GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { config } from '../utils/config';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { AlmacenService } from '../utils/almacen';
import { ClienteAuth } from '../interfaces/auth';
import { CrearValidacionDto } from '../schemas/validaciones';
import { INSERTAR_VALIDACION, SUPRIMIR_VALIDACION, VALIDACION_DE_CLIENTE, VALIDACIONES_POR_RUT } from '../queries/validaciones';
import { AuditoriaService } from './auditoria';
import { WebhooksService } from './webhooks';

@Injectable()
export class ValidacionesService {
  private log = new Logger('Validaciones');
  constructor(
    private db: DbService,
    private cripto: CriptoService,
    private almacen: AlmacenService,
    private audit: AuditoriaService,
    private webhooks: WebhooksService,
  ) {}

  async crear(cliente: ClienteAuth, dto: CrearValidacionDto, ip: string, actor = `cliente:${cliente.id}`, firmanteId: string | null = null, db: { query: (s: string, p: unknown[]) => Promise<unknown> } | null = null) {
    const rut = CriptoService.normalizarRut(dto.rut);
    if (!rut) throw new BadRequestException('RUT inválido (revisa el dígito verificador)');
    const id = randomUUID();
    const token = this.cripto.token(32);
    const linkExpira = new Date(Date.now() + config.captura.linkMinutos * 60_000);
    await (db ? db.query.bind(db) : this.db.q.bind(this.db))(
      INSERTAR_VALIDACION,
      [id, cliente.id, this.cripto.hashRut(rut), CriptoService.mascaraRut(rut), dto.nombre ?? null, dto.documento_id ?? null, dto.referencia ?? null,
        dto.url_confirmacion ?? null, dto.url_retorno ?? null, this.cripto.sha256(token), linkExpira, this.cripto.envolver(this.cripto.nuevaDek()), firmanteId],
    );
    await this.audit.registrar('validacion.creada', actor, id, ip, { documento_id: dto.documento_id, referencia: dto.referencia });
    return { validacion_id: id, estado: 'creada', url_captura: `${config.urlPublica}/captura/${token}`, expira_en: linkExpira.toISOString() };
  }

  async fila(cliente: ClienteAuth, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundException('Validación no encontrada');
    const r = await this.db.uno(VALIDACION_DE_CLIENTE, [id, cliente.id]);
    if (!r) throw new NotFoundException('Validación no encontrada');
    return r;
  }

  async obtener(cliente: ClienteAuth, id: string, ip: string) {
    const r = await this.fila(cliente, id);
    await this.audit.registrar('validacion.consultada', `cliente:${cliente.id}`, id, ip);
    return ValidacionesService.vista(r);
  }

  static vista(r: any) {
    const res = r.resultado || {};
    return {
      validacion_id: r.id,
      estado: r.estado,
      motivos: r.motivos,
      rut: r.rut_mascara,
      documento_id: r.documento_id,
      referencia: r.referencia,
      veredicto_dispositivo: r.veredicto_cliente,
      puntajes: r.resultado ? {
        huella: res.huella?.probabilidad ?? null,
        rostro: res.rostro?.probabilidad ?? null,
        prueba_de_vida: res.rostro?.prueba_de_vida ?? null,
        firma: res.firma?.parecido ?? null,
      } : null,
      evidencia_sha256: r.evidencia_sha256,
      integridad: r.integridad,
      verificacion_servidor: r.verificacion_servidor,
      consentimiento: r.consentimiento ? { version: r.consentimiento.version, otorgado_en: r.consentimiento.otorgado_en, recibido_en: r.consentimiento.recibido_en } : null,
      creada_en: r.creado_en,
      actualizada_en: r.actualizado_en,
      retener_hasta: r.retener_hasta,
    };
  }

  // Descarga para peritaje/auditoría: descifra en memoria y registra quién y por qué.
  async evidencia(cliente: ClienteAuth, id: string, motivo: string, ip: string, actor = `cliente:${cliente.id}`): Promise<Buffer> {
    const r = await this.fila(cliente, id);
    if (!r.objeto_clave || !r.evidencia_subida_en) throw new NotFoundException('Esta validación no tiene evidencia');
    if (!r.dek_envuelta) throw new GoneException('La evidencia fue eliminada');
    await this.audit.registrar('evidencia.descargada', actor, id, ip, { motivo });
    const archivo = await this.almacen.leer(r.objeto_clave);
    return this.cripto.descifrarEvidencia(archivo, this.cripto.desenvolver(r.dek_envuelta));
  }

  async borrar(cliente: ClienteAuth, id: string, motivo: string, ip: string, actor = `cliente:${cliente.id}`) {
    const r = await this.fila(cliente, id);
    await this.suprimir(r, actor, ip, 'solicitud', motivo);
    return { validacion_id: id, estado: 'borrada' };
  }

  async porRut(cliente: ClienteAuth, rut: string, ip: string) {
    const n = CriptoService.normalizarRut(rut);
    if (!n) throw new BadRequestException('RUT inválido');
    const filas = await this.db.q(VALIDACIONES_POR_RUT, [cliente.id, this.cripto.hashRut(n)]);
    await this.audit.registrar('titular.consultado', `cliente:${cliente.id}`, null, ip, { rut: CriptoService.mascaraRut(n), resultados: filas.length });
    return { rut: CriptoService.mascaraRut(n), validaciones: filas.map(ValidacionesService.vista) };
  }

  // Supresión (derecho del titular o fin de retención): borra el objeto y destruye la DEK (crypto-shredding).
  // Se conservan solo el id, estado, hash y fechas, para acreditar que la validación existió y fue eliminada.
  async suprimir(r: any, actor: string, ip: string | null, causa: 'solicitud' | 'retencion' | 'expiracion', motivo?: string) {
    if (r.objeto_clave) {
      try { await this.almacen.borrar(r.objeto_clave); } catch (e) { this.log.warn(`No se pudo borrar el objeto de ${r.id}: ${(e as Error).message}`); throw e; }
    }
    const estado = causa === 'expiracion' ? 'expirada' : 'borrada';
    await this.db.q(SUPRIMIR_VALIDACION, [r.id, estado]);
    await this.audit.registrar(causa === 'solicitud' ? 'validacion.suprimida' : causa === 'retencion' ? 'validacion.retencion_vencida' : 'validacion.expirada', actor, r.id, ip, motivo ? { motivo } : undefined);
    if (causa === 'expiracion') await this.webhooks.encolar(r.id, 'validacion.expirada');
  }
}
