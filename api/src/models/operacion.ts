import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { DbService } from '../utils/database';
import { CriptoService } from '../utils/cripto';
import { AlmacenService } from '../utils/almacen';
import { Operacion } from '../interfaces/operacion';
import { VALIDACION_DE_CLIENTE } from '../queries/validaciones';
import { AuditoriaService } from './auditoria';

// Abre la evidencia cifrada de una validación y extrae lo necesario para revisar los 3 factores.
// El ZIP descifrado vive solo en memoria y unos minutos (para que el informe no lo descargue de nuevo).

@Injectable()
export class OperacionService {
  private cache = new Map<string, { at: number; op: Operacion }>();
  constructor(private db: DbService, private cripto: CriptoService, private almacen: AlmacenService, private audit: AuditoriaService) {}

  async abrir(clienteId: string, id: string, actor: string, ip: string): Promise<Operacion> {
    const clave = `${clienteId}:${id}`;   // por cliente: un admin no ve desde el caché la evidencia de otro cliente
    const hit = this.cache.get(clave);
    if (hit && Date.now() - hit.at < 5 * 60_000) return hit.op;
    const r = await this.db.uno(VALIDACION_DE_CLIENTE, [id, clienteId]);
    if (!r) throw new NotFoundException('Validación no encontrada');
    if (!r.objeto_clave || !r.evidencia_subida_en) throw new NotFoundException('Esta validación aún no tiene evidencia');
    if (!r.dek_envuelta) throw new GoneException('La evidencia fue eliminada');
    const zipBuf = this.cripto.descifrarEvidencia(await this.almacen.leer(r.objeto_clave), this.cripto.desenvolver(r.dek_envuelta));
    const op = OperacionService.extraer(zipBuf);
    await this.audit.registrar('evidencia.revisada', actor, id, ip);
    this.cache.set(clave, { at: Date.now(), op });
    for (const [k, v] of this.cache) if (Date.now() - v.at > 5 * 60_000) this.cache.delete(k);
    return op;
  }
  olvidar(clienteId: string, id: string) { this.cache.delete(`${clienteId}:${id}`); }

  static extraer(zipBuf: Buffer): Operacion {
    const zip = new AdmZip(zipBuf);
    const leer = (n: string) => { const e = zip.getEntry(n); return e ? e.getData() : null; };
    const img = (n: string | null) => {
      if (!n) return null; const d = leer(n); if (!d) return null;
      return { mime: n.endsWith('.png') ? 'image/png' : 'image/jpeg', data: d };
    };
    let datos: any = {};
    try { datos = JSON.parse(leer('datos.json')?.toString('utf8') || '{}'); } catch { datos = {}; }
    const nombres = zip.getEntries().map((e) => e.entryName);
    const res = datos.resultado || {}, ro = datos.rostro || {}, fi = datos.firma || {}, ocr = datos.ocr || {};
    const porFirma: number[] = (fi.porFirma || []).map((x: any) => (typeof x?.score === 'number' ? x.score : null)).filter((x: any) => x != null);
    const mejor = porFirma.length ? porFirma.indexOf(Math.max(...porFirma)) : 0;
    const huellaCapturada = nombres.includes('pulgar/huella_armada.jpg') ? 'pulgar/huella_armada.jpg' : nombres.find((n) => /^pulgar\/fragmento_\d+_unido\.jpg$/.test(n)) || null;
    const selfie = nombres.find((n) => /^rostro\/selfie_\d+_recorte\.jpg$/.test(n)) || nombres.find((n) => /^rostro\/selfie_\d+\.jpg$/.test(n)) || null;
    const firmaDibujada = nombres.includes(`firma/firma_${mejor + 1}.png`) ? `firma/firma_${mejor + 1}.png` : nombres.find((n) => /^firma\/firma_\d+\.png$/.test(n)) || null;
    const huellaCedula = nombres.find((n) => /^cedula\/acercamiento_\d+\.jpg$/.test(n)) || null;
    const front = ocr.frente || {}, mrz = ocr.mrz || {}, chk = ocr.verificacion || {};
    const t0 = datos.iniciado ? Date.parse(datos.iniciado) : NaN;
    return {
      imagenes: {
        cedula_frente: img('cedula/frente.jpg'),
        cedula_reverso: img('cedula/reverso.jpg'),
        rostro_cedula: img('rostro/cedula_rostro.jpg'),
        rostro_selfie: img(selfie),
        huella_cedula: img(huellaCedula),
        huella_capturada: img(huellaCapturada),
        firma_cedula: img('firma/cedula_firma.jpg'),
        firma_dibujada: img(firmaDibujada),
      },
      datos: {
        huella: {
          probabilidad: num(res.probabilidad), veredicto: res.veredicto ?? null, fragmentos: num(res.fragmentos),
          zonas: num(res.positivos), zonasTotal: num(res.dentro),
          cobertura: num(res.cobertura), muestraDebil: !!datos.huellaCedulaDebil,
        },
        rostro: {
          probabilidad: num(ro.probabilidad), distancia: num(ro.distancia), veredicto: ro.veredicto ?? null,
          vida: !!ro.pruebaDeVida?.ok, desafios: (ro.pruebaDeVida?.challenges || []).map((c: string) => (c === 'blink' ? 'parpadeo' : c === 'turn' ? 'giro de cabeza' : c === 'mouth' ? 'abrir la boca' : c)),
          alertas: ro.alertas || [],
        },
        firma: { parecido: num(fi.parecido), consistencia: num(fi.consistencia), veredicto: fi.veredicto ?? null, porFirma, mejor },
        cedula: {
          nombres: front.names ?? null, apellidos: front.surnames ?? null, run: front.run ?? null, runValido: front.runValid ?? null,
          runMrz: mrz.run ?? null, coincidenFrenteReverso: chk.runMatch ?? null,
        },
        global: datos.resultadoGlobal?.veredicto ?? null,
        dispositivo: datos.perfilDispositivo ? [datos.perfilDispositivo.nombre, datos.perfilDispositivo.modelo].filter(Boolean).join(' · ') : null,
        inicio: datos.iniciado ?? null,
        fin: datos.fecha ?? null,
        motores: { huella: datos.motor ? `FPEngine ${datos.motor}` : '', rostro: ro.motor || '', firma: fi.motor || '' },
      },
    };
  }
}
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : null);
