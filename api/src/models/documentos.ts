import { BadRequestException, ConflictException, GoneException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { AlmacenService } from '../utils/almacen';
import { FirmadorClient } from '../utils/firmador';
import { formatoRut } from '../utils/archivos';
import { ClienteAuth } from '../interfaces/auth';
import { HABILITAN_FIRMA } from '../data/estados';
import { ALTO, ANCHO, MAX_INTENTOS_FIRMA, MAX_PDF } from '../data/documentos';
import { CrearDocumentoDto } from '../schemas/documentos';
import * as Q from '../queries/documentos';
import { INSERTAR_AUDITORIA } from '../queries/auditoria';
import { CLIENTE_POR_ID } from '../queries/clientes';
import { EXPIRAR_VALIDACION } from '../queries/validaciones';
import { AuditoriaService } from './auditoria';
import { WebhooksService } from './webhooks';
import { ValidacionesService } from './validaciones';
import { OperacionService } from './operacion';

@Injectable()
export class DocumentosService implements OnModuleInit {
  private log = new Logger('Documentos');
  private corriendo = false;
  constructor(
    private db: DbService,
    private cripto: CriptoService,
    private almacen: AlmacenService,
    private audit: AuditoriaService,
    private webhooks: WebhooksService,
    private validaciones: ValidacionesService,
    private firmador: FirmadorClient,
  ) {}

  onModuleInit() {
    setTimeout(() => this.procesarPendientes().catch(() => undefined), 5000);
  }

  private clave(id: string, version: number) {
    return `documentos/${id}/v${version}.enc`;
  }

  // ------------------------------------------------------------------ registro
  async crear(cliente: ClienteAuth, dto: CrearDocumentoDto, ip: string, actor = `cliente:${cliente.id}`) {
    const original = Buffer.from(dto.pdf, 'base64');
    if (original.length > MAX_PDF) throw new BadRequestException('El PDF supera 25 MB');
    if (original.subarray(0, 5).toString('latin1') !== '%PDF-') throw new BadRequestException('El archivo no es un PDF');
    const orden = dto.orden || 'libre';
    const id = randomUUID();

    // RUT válidos y no repetidos
    const firmantes = dto.firmantes.map((f, i) => {
      const rut = CriptoService.normalizarRut(f.rut);
      if (!rut) throw new BadRequestException(`RUT inválido del firmante ${i + 1}`);
      return { id: randomUUID(), orden: i + 1, rut, nombre: f.nombre.trim(), ubicaciones: f.ubicaciones.map((u, j) => ({ nombre: `firma_${i + 1}_${j + 1}`, pagina: u.pagina, x: u.x, y: u.y, ancho: u.ancho ?? ANCHO, alto: u.alto ?? ALTO })) };
    });
    if (new Set(firmantes.map((f) => f.rut)).size !== firmantes.length) throw new BadRequestException('Hay un RUT repetido entre los firmantes');
    // recuadros superpuestos en la misma página quedarían ilegibles
    const todas = firmantes.flatMap((f) => f.ubicaciones);
    for (let a = 0; a < todas.length; a++) for (let b = a + 1; b < todas.length; b++) {
      const p = todas[a], q = todas[b];
      if (p.pagina === q.pagina && p.x < q.x + q.ancho && q.x < p.x + p.ancho && p.y < q.y + q.alto && q.y < p.y + p.alto)
        throw new BadRequestException(`Los recuadros ${p.nombre} y ${q.nombre} se superponen en la página ${p.pagina}`);
    }

    // el firmador valida páginas y límites, crea los campos vacíos y certifica el documento (sello MatchOnCard)
    const prep = await this.firmador.preparar(original, todas, id, dto.nombre);
    const sellado = Buffer.from(prep.pdf, 'base64');
    const dek = this.cripto.nuevaDek();
    const objeto = this.clave(id, 1);
    await this.almacen.escribir(objeto, this.cripto.cifrarDocumento(sellado, dek, id));
    const shaOriginal = this.cripto.sha256(original), shaActual = this.cripto.sha256(sellado);

    await this.db.tx(async (c) => {
      await c.query(Q.INSERTAR_DOCUMENTO,
        [id, cliente.id, dto.nombre, dto.referencia ?? null, dto.url_confirmacion ?? null, dto.url_retorno ?? null, orden, this.cripto.envolver(dek), objeto, prep.paginas, shaOriginal, shaActual]);
      await c.query(Q.INSERTAR_VERSION_INICIAL, [id, shaActual]);
      for (const f of firmantes) {
        const activo = orden === 'libre' || f.orden === 1;
        await c.query(Q.INSERTAR_FIRMANTE,
          [f.id, id, f.orden, f.nombre, this.cripto.hashRut(f.rut), CriptoService.mascaraRut(f.rut), this.cripto.envolver(Buffer.from(f.rut)),
            JSON.stringify(f.ubicaciones), f.ubicaciones.map((u) => u.nombre), activo ? 'pendiente' : 'en_espera']);
      }
    });
    await this.audit.registrar('documento.registrado', actor, null, ip, { documento_id: id, sha256_original: shaOriginal, firmantes: firmantes.length, orden });

    const enlaces: Record<string, { url_captura: string; expira_en: string } | null> = {};
    for (const f of firmantes) enlaces[f.id] = orden === 'libre' || f.orden === 1 ? await this.emitirEnlace(cliente, id, f.id, ip, actor) : null;
    return { ...(await this.vista(cliente, id)), enlaces_firmantes: firmantes.map((f) => ({ firmante_id: f.id, orden: f.orden, nombre: f.nombre, ...(enlaces[f.id] || { url_captura: null, expira_en: null }) })) };
  }

  // Crea la validación biométrica del firmante; el link solo se puede entregar ahora (no guardamos el token).
  private async emitirEnlace(cliente: ClienteAuth, documentoId: string, firmanteId: string, ip: string, actor: string) {
    const f = await this.db.uno(Q.FIRMANTE_CON_DOCUMENTO, [firmanteId]);
    const rut = this.cripto.desenvolver(f.rut_cifrado).toString();
    const v = await this.validaciones.crear(cliente, { rut, nombre: f.nombre, documento_id: documentoId, referencia: f.referencia ?? `Firma de ${f.doc_nombre}`.slice(0, 120), url_confirmacion: f.url_confirmacion ?? undefined, url_retorno: f.url_retorno ?? undefined }, ip, actor, firmanteId);
    await this.db.q(Q.ASIGNAR_VALIDACION, [firmanteId, v.validacion_id]);
    return { url_captura: v.url_captura, expira_en: v.expira_en, validacion_id: v.validacion_id };
  }

  // Link nuevo para un firmante (venció, lo perdió o su validación salió rechazada)
  async reenviar(cliente: ClienteAuth, documentoId: string, firmanteId: string, ip: string, actor = `cliente:${cliente.id}`) {
    const d = await this.fila(cliente, documentoId);
    if (d.estado !== 'pendiente') throw new ConflictException(`El documento está ${d.estado}`);
    const f = await this.db.uno(Q.FIRMANTE_CON_VALIDACION, [firmanteId, documentoId]);
    if (!f) throw new NotFoundException('Firmante no encontrado');
    if (f.estado === 'en_espera') throw new ConflictException('Aún no es el turno de este firmante (orden secuencial)');
    if (f.estado !== 'pendiente') throw new ConflictException(`El firmante está ${f.estado}`);
    if (['en_captura', 'consentida'].includes(f.v_estado)) throw new ConflictException('El firmante está completando su validación en este momento');
    if (f.validacion_id && f.v_estado === 'creada') await this.db.q(EXPIRAR_VALIDACION, [f.validacion_id]);
    const e = await this.emitirEnlace(cliente, documentoId, firmanteId, ip, actor);
    await this.audit.registrar('documento.enlace_reemitido', actor, e.validacion_id, ip, { documento_id: documentoId, firmante_id: firmanteId });
    return { firmante_id: firmanteId, ...e };
  }

  // ------------------------------------------------------------------ consulta
  async fila(cliente: ClienteAuth, id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new NotFoundException('Documento no encontrado');
    const d = await this.db.uno(Q.DOCUMENTO_DE_CLIENTE, [id, cliente.id]);
    if (!d) throw new NotFoundException('Documento no encontrado');
    return d;
  }

  async vista(cliente: ClienteAuth, id: string) {
    const d = await this.fila(cliente, id);
    const fs = await this.db.q(Q.FIRMANTES_DE_DOCUMENTO, [id]);
    return {
      documento_id: d.id, nombre: d.nombre, referencia: d.referencia, estado: d.estado, orden: d.orden, paginas: d.paginas,
      version: d.version, sha256_original: d.sha256_original, sha256_actual: d.sha256_actual,
      creado_en: d.creado_en, completado_en: d.completado_en, motivo_cancelacion: d.motivo_cancelacion,
      firmantes: fs.map((f) => ({
        firmante_id: f.id, orden: f.orden, nombre: f.nombre, rut: f.rut_mascara, estado: f.estado,
        ubicaciones: (f.ubicaciones || []).map((u: any) => ({ pagina: u.pagina, x: u.x, y: u.y, ancho: u.ancho, alto: u.alto })),
        validacion_id: f.validacion_id, validacion_estado: f.validacion_estado, firmado_en: f.firmado_en,
        observaciones: f.estado === 'firmado' && f.validacion_estado === 'revision' ? 'validación con observaciones' : null,
      })),
    };
  }

  async listar(cliente: ClienteAuth, limite = 100) {
    return this.db.q(Q.LISTAR_DOCUMENTOS, [cliente.id, limite]);
  }

  async pdf(cliente: ClienteAuth, id: string, ip: string, actor = `cliente:${cliente.id}`) {
    const d = await this.fila(cliente, id);
    if (!d.dek_envuelta || !d.objeto_clave) throw new GoneException('El documento fue eliminado');
    const pdf = this.cripto.descifrarDocumento(await this.almacen.leer(d.objeto_clave), this.cripto.desenvolver(d.dek_envuelta), d.id);
    await this.audit.registrar('documento.descargado', actor, null, ip, { documento_id: id, version: d.version });
    return { pdf, nombre: d.nombre, version: d.version, sha256: d.sha256_actual, estado: d.estado };
  }

  async cancelar(cliente: ClienteAuth, id: string, motivo: string, ip: string, actor = `cliente:${cliente.id}`) {
    const d = await this.fila(cliente, id);
    if (d.estado !== 'pendiente') throw new ConflictException(`El documento está ${d.estado}`);
    await this.db.tx(async (c) => {
      await c.query(Q.CANCELAR_DOCUMENTO, [id, motivo]);
      await c.query(Q.CANCELAR_FIRMANTES, [id]);
      await c.query(Q.EXPIRAR_VALIDACIONES_DE_DOCUMENTO, [id]);
    });
    await this.audit.registrar('documento.cancelado', actor, null, ip, { documento_id: id, motivo });
    await this.webhooks.encolarDocumento(id, 'documento.cancelado', { motivo });
    return this.vista(cliente, id);
  }

  // Supresión (DPO): destruye la clave del documento y borra todas sus versiones del bucket. Quedan solo los hashes.
  async suprimir(cliente: ClienteAuth, id: string, motivo: string, ip: string, actor = `cliente:${cliente.id}`) {
    const d = await this.fila(cliente, id);
    for (let v = 1; v <= d.version; v++) await this.almacen.borrar(this.clave(id, v)).catch(() => undefined);
    await this.db.tx(async (c) => {
      await c.query(Q.SUPRIMIR_DOCUMENTO, [id]);
      await c.query(Q.SUPRIMIR_FIRMANTES, [id]);
    });
    await this.audit.registrar('documento.suprimido', actor, null, ip, { documento_id: id, motivo });
    return { documento_id: id, suprimido: true };
  }

  // ------------------------------------------------------------------ firma tras la validación
  // Lo llama la captura cuando el teléfono entrega el resultado de una validación ligada a un firmante.
  async alFinalizarValidacion(validacionId: string) {
    const v = await this.db.uno(Q.VALIDACION_DE_FIRMANTE, [validacionId]);
    if (!v?.firmante_id) return;
    const f = await this.db.uno(Q.FIRMANTE_Y_ESTADO_DOCUMENTO, [v.firmante_id]);
    if (!f || f.validacion_id !== v.id || f.estado !== 'pendiente' || f.doc_estado !== 'pendiente') return;
    if (HABILITAN_FIRMA.includes(v.estado)) {
      await this.db.q(Q.MARCAR_VALIDADO, [f.id]);
      setImmediate(() => this.procesarPendientes().catch((e) => this.log.error(e.message)));
    } else {
      await this.audit.registrar('documento.validacion_fallida', 'sistema', v.id, null, { documento_id: f.documento_id, firmante_id: f.id, estado: v.estado });
      await this.webhooks.encolarDocumento(f.documento_id, 'documento.validacion_fallida', { firmante_id: f.id, orden: f.orden, validacion_id: v.id, validacion_estado: v.estado });
    }
  }

  @Interval(20_000)
  async procesarPendientes() {
    if (this.corriendo) return;
    this.corriendo = true;
    try {
      const filas = await this.db.q(Q.FIRMANTES_POR_FIRMAR, [MAX_INTENTOS_FIRMA]);
      for (const f of filas) {
        try { await this.firmar(f.id); } catch (e) {
          const msg = (e as Error).message.slice(0, 300);
          this.log.error(`No se pudo firmar (firmante ${f.id}): ${msg}`);
          await this.db.q(Q.REGISTRAR_ERROR_FIRMA, [f.id, msg]);
        }
      }
    } finally {
      this.corriendo = false;
    }
  }

  private async firmar(firmanteId: string) {
    let viejo: string | null = null, docId = '', completado = false, siguiente: any = null, ordenFirmado = 0, clienteId = '';
    await this.db.tx(async (c) => {
      const f = (await c.query(Q.FIRMANTE_POR_ID, [firmanteId])).rows[0];
      const d = (await c.query(Q.BLOQUEAR_DOCUMENTO, [f.documento_id])).rows[0];
      const fr = (await c.query(Q.ESTADO_FIRMANTE, [firmanteId])).rows[0];
      if (fr.estado !== 'validado' || d.estado !== 'pendiente' || !d.dek_envuelta) return;
      const v = (await c.query(Q.VALIDACION_POR_ID, [f.validacion_id])).rows[0];
      if (!v || !HABILITAN_FIRMA.includes(v.estado)) throw new Error('La validación del firmante no habilita la firma');

      // firma dibujada por el firmante (de su evidencia cifrada)
      let firmaPng: Buffer | null = null;
      if (v.objeto_clave && v.dek_envuelta) {
        try {
          const zip = this.cripto.descifrarEvidencia(await this.almacen.leer(v.objeto_clave), this.cripto.desenvolver(v.dek_envuelta));
          firmaPng = OperacionService.extraer(zip).imagenes.firma_dibujada?.data ?? null;
        } catch (e) { this.log.warn(`Sin firma dibujada para ${v.id}: ${(e as Error).message}`); }
      }
      const dek = this.cripto.desenvolver(d.dek_envuelta);
      const actual = this.cripto.descifrarDocumento(await this.almacen.leer(d.objeto_clave), dek, d.id);
      if (this.cripto.sha256(actual) !== d.sha256_actual) throw new Error('La versión guardada del documento no coincide con su hash');
      const r = await this.firmador.firmar({
        pdf: actual, campos: f.campos, nombre: f.nombre, rut: formatoRut(this.cripto.desenvolver(f.rut_cifrado).toString()),
        validacion_id: v.id, evidencia_sha256: v.evidencia_sha256 || '', estado_validacion: v.estado, firma_png: firmaPng, documento_id: d.id,
      });
      const nuevo = Buffer.from(r.pdf, 'base64');
      const version = d.version + 1, sha = this.cripto.sha256(nuevo), objeto = this.clave(d.id, version);
      await this.almacen.escribir(objeto, this.cripto.cifrarDocumento(nuevo, dek, d.id));
      await c.query(Q.NUEVA_VERSION, [d.id, version, objeto, sha]);
      await c.query(Q.INSERTAR_VERSION, [d.id, version, sha, `firmado:${f.id}`]);
      await c.query(Q.MARCAR_FIRMADO, [f.id]);
      await c.query(INSERTAR_AUDITORIA,
        [v.id, 'sistema', 'documento.firmado', null, { documento_id: d.id, firmante_id: f.id, version, sha256: sha, campos: f.campos, validacion_estado: v.estado }]);

      const resto = (await c.query(Q.FIRMANTES_RESTANTES, [d.id])).rows;
      if (!resto.length) {
        await c.query(Q.COMPLETAR_DOCUMENTO, [d.id]);
        await c.query(INSERTAR_AUDITORIA, [null, 'sistema', 'documento.completado', null, { documento_id: d.id, version, sha256: sha }]);
        completado = true;
      } else if (d.orden === 'secuencial' && resto[0].estado === 'en_espera') {
        await c.query(Q.ACTIVAR_FIRMANTE, [resto[0].id]);
        siguiente = resto[0];
      }
      viejo = d.objeto_clave; docId = d.id; ordenFirmado = f.orden; clienteId = d.cliente_id;
    });
    if (!docId) return;
    if (viejo) await this.almacen.borrar(viejo).catch(() => undefined);   // la versión anterior ya no hace falta (su hash queda registrado)
    await this.webhooks.encolarDocumento(docId, 'documento.firmado', { firmante_id: firmanteId, orden: ordenFirmado });
    if (completado) await this.webhooks.encolarDocumento(docId, 'documento.completado');
    if (siguiente) {
      const cli = await this.db.uno(CLIENTE_POR_ID, [clienteId]);
      const e = await this.emitirEnlace(cli, docId, siguiente.id, '', 'sistema');
      await this.webhooks.encolarDocumento(docId, 'documento.turno', { firmante_id: siguiente.id, orden: siguiente.orden, url_captura: e.url_captura, expira_en: e.expira_en });
    }
  }

  // ------------------------------------------------------------------ verificación pública
  async verificar(pdf: Buffer) {
    if (pdf.length > MAX_PDF) throw new BadRequestException('El PDF supera 25 MB');
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') throw new BadRequestException('El archivo no es un PDF');
    const r = await this.firmador.verificar(pdf);
    const reg = await this.db.uno(Q.VERSION_POR_HASH, [r.sha256]);
    const firmas = (r.firmas || []).map((f: any) => ({
      tipo: f.certificacion ? 'sello' : 'firma', nombre: f.nombre || null, fecha: f.fecha, motivo: f.motivo || null,
      integra: !!f.integra, emitida_por_matchoncard: !!f.confiable, modificaciones_permitidas: f.modificaciones_permitidas !== false,
      error: f.error ? 'No se pudo validar esta firma' : undefined,
    }));
    const sello = firmas.find((f: any) => f.tipo === 'sello');
    const valido = !!sello && firmas.length > 0 && firmas.every((f: any) => f.integra && f.emitida_por_matchoncard && f.modificaciones_permitidas);
    return {
      sha256: r.sha256,
      valido,
      resumen: !firmas.length ? 'El documento no contiene firmas electrónicas.'
        : !sello ? 'El documento no fue emitido por MatchOnCard.'
        : valido ? (r.campos_pendientes.length ? 'Firmas válidas. Aún faltan firmantes por firmar.' : 'Documento íntegro: todas las firmas son válidas y no fue modificado después de firmar.')
        : 'Atención: el documento fue modificado después de firmarse o alguna firma no es válida.',
      firmas,
      firmas_pendientes: r.campos_pendientes.length,
      registro: reg ? {
        encontrado: true, estado: reg.estado, version: reg.version, es_version_vigente: reg.version === reg.version_vigente,
        firmantes: reg.firmantes, firmados: reg.firmados, completado_en: reg.completado_en,
      } : { encontrado: false },
    };
  }
}
