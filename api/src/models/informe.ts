import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createHash } from 'crypto';
import { DbService } from '../utils/database';
import { Operacion } from '../interfaces/operacion';
import { C, ESTADO, MOTIVOS } from '../data/informe';
import { INSERTAR_INFORME, SIGUIENTE_FOLIO } from '../queries/panel';
import { AuditoriaService } from './auditoria';

const pct = (v: number | null | undefined, d = 1) => (v == null ? '—' : `${(v * 100).toFixed(v >= 0.995 && v < 1 ? 2 : d)} %`);
const fecha = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'long', timeStyle: 'medium' }) : '—';

@Injectable()
export class InformeService {
  constructor(private db: DbService, private audit: AuditoriaService) {}

  async emitir(v: any, op: Operacion, historial: any[], actor: string, ip: string): Promise<{ pdf: Buffer; folio: string; sha256: string }> {
    const fila = await this.db.uno<{ folio: string }>(SIGUIENTE_FOLIO);
    const n = fila!.folio;
    const folio = `MOC-${new Date().getFullYear()}-${n.padStart(6, '0')}`;
    const pdf = await this.render(v, op, historial, folio, actor);
    const sha256 = createHash('sha256').update(pdf).digest('hex');
    await this.db.q(INSERTAR_INFORME, [n, v.validacion_id, sha256, pdf.length, actor]);
    await this.audit.registrar('informe.emitido', actor, v.validacion_id, ip, { folio, sha256 });
    return { pdf, folio, sha256 };
  }

  private render(v: any, op: Operacion, historial: any[], folio: string, actor: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 56, left: 48, right: 48 }, bufferPages: true,
        info: { Title: `Informe de validación de identidad ${folio}`, Author: 'MatchOnCard', Subject: 'Validación en 3 pasos: huella, rostro y firma', Creator: 'MatchOnCard' } });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
      const W = doc.page.width, M = 48, CW = W - 2 * M;
      const d = op.datos, res = v.resultado || {};
      const [estTxt, estCol] = ESTADO[v.estado] || [v.estado, C.ink2];

      const h1 = (t: string) => { ensure(40); doc.moveDown(0.6).font('Helvetica-Bold').fontSize(13).fillColor(C.ink).text(t, M); const y = doc.y + 3; doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.6).strokeColor(C.line).stroke(); doc.y = y + 8; };
      const fila = (k: string, val: string, opts: { mono?: boolean } = {}) => {
        ensure(18); const y = doc.y;
        doc.font('Helvetica').fontSize(9.5).fillColor(C.ink2).text(k, M, y, { width: 170 });
        doc.font(opts.mono ? 'Courier' : 'Helvetica').fontSize(opts.mono ? 8.5 : 9.5).fillColor(C.ink).text(val || '—', M + 178, y, { width: CW - 178 });
        doc.y = Math.max(doc.y, y + 14) + 2;
      };
      const ensure = (h: number) => { if (doc.y + h > doc.page.height - 70) doc.addPage(); };
      const imagen = (key: string, x: number, y: number, w: number, h: number, etiqueta: string) => {
        doc.rect(x, y, w, h).fillColor(C.soft).fill();
        const im = op.imagenes[key];
        if (im) { try { doc.image(im.data, x + 4, y + 4, { fit: [w - 8, h - 8], align: 'center', valign: 'center' }); } catch { /* imagen dañada */ } }
        else doc.font('Helvetica').fontSize(8).fillColor(C.ink3).text('sin imagen', x, y + h / 2 - 4, { width: w, align: 'center' });
        doc.font('Helvetica').fontSize(8).fillColor(C.ink2).text(etiqueta, x, y + h + 4, { width: w, align: 'center' });
      };

      // ── encabezado ──
      doc.rect(0, 0, W, 6).fillColor(C.accent).fill();
      doc.font('Helvetica-Bold').fontSize(18).fillColor(C.ink).text('Informe de validación de identidad', M, 30);
      doc.font('Helvetica').fontSize(9.5).fillColor(C.ink2).text(`MatchOnCard · Validación en 3 pasos (huella, rostro y firma) · Folio ${folio}`, M, doc.y + 2);
      doc.text(`Emitido el ${fecha(new Date())} por ${actor.replace(/^admin:/, '')}`, M);
      doc.moveDown(0.8);

      // ── resultado ──
      const by = doc.y;
      doc.roundedRect(M, by, CW, 74, 8).fillColor(C.soft).fill();
      doc.font('Helvetica-Bold').fontSize(20).fillColor(estCol).text(estTxt, M + 16, by + 14, { width: CW - 32 });
      const resumen = [
        `Huella ${pct(d.huella.probabilidad)} · ${d.huella.veredicto || '—'}`,
        `Rostro ${pct(d.rostro.probabilidad, 0)} · ${d.rostro.veredicto || '—'}${d.rostro.vida ? ' · prueba de vida superada' : ''}`,
        `Firma ${d.firma.parecido ?? '—'}/100 · ${d.firma.veredicto || '—'}`,
      ].join('     ');
      doc.font('Helvetica').fontSize(9.5).fillColor(C.ink).text(resumen, M + 16, by + 44, { width: CW - 32 });
      doc.y = by + 84;
      if ((v.motivos || []).length) {
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.warn).text('Observaciones', M);
        for (const m of v.motivos) doc.font('Helvetica').fontSize(9.5).fillColor(C.ink).text(`• ${MOTIVOS[m] || m}`, M + 8);
        doc.moveDown(0.4);
      }

      // ── identificación ──
      h1('Identificación');
      fila('Nombre (cédula)', [d.cedula.nombres, d.cedula.apellidos].filter(Boolean).join(' ') || v.nombre || '—');
      fila('RUN leído de la cédula', `${d.cedula.run || '—'}${d.cedula.runValido ? ' (dígito verificador válido)' : ''}`);
      fila('RUN en el reverso (MRZ)', `${d.cedula.runMrz || '—'}${d.cedula.coincidenFrenteReverso === true ? ' · coincide con el frente' : d.cedula.coincidenFrenteReverso === false ? ' · NO coincide con el frente' : ''}`);
      fila('RUT esperado', `${v.rut || '—'} (registrado como hash; se muestran los últimos dígitos)`);
      fila('Documento / referencia', [v.documento_id, v.referencia].filter(Boolean).join(' · ') || '—');
      fila('Identificador de validación', v.validacion_id, { mono: true });

      // ── tres factores ──
      h1('Comparación de los tres factores');
      const colW = (CW - 24) / 2, ih = 118;
      const bloque = (titulo: string, detalle: string, a: string, b: string, la: string, lb: string) => {
        ensure(ih + 60);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink).text(titulo, M);
        doc.font('Helvetica').fontSize(9).fillColor(C.ink2).text(detalle, M, doc.y + 1, { width: CW });
        const y = doc.y + 6;
        imagen(a, M, y, colW, ih, la); imagen(b, M + colW + 24, y, colW, ih, lb);
        doc.y = y + ih + 22;
      };
      bloque('1 · Huella dactilar',
        `Probabilidad de que el pulgar sea el de la cédula: ${pct(d.huella.probabilidad)} (${d.huella.veredicto || '—'}). ` +
        `${d.huella.fragmentos ?? '—'} fotogramas evaluados${d.huella.zonas != null ? `; en el mejor, ${d.huella.zonas} de ${d.huella.zonasTotal} zonas calzan` : ''}` +
        `${d.huella.cobertura != null ? `; cobertura ${Math.round(d.huella.cobertura * 100)} %` : ''}.${d.huella.muestraDebil ? ' La huella impresa en la cédula es de baja calidad.' : ''}`,
        'huella_cedula', 'huella_capturada', 'Huella impresa en la cédula (acercamiento)', 'Huella capturada con el teléfono');
      bloque('2 · Rostro',
        `Probabilidad de misma persona: ${pct(d.rostro.probabilidad, 0)} (distancia ${d.rostro.distancia ?? '—'}; ${d.rostro.veredicto || '—'}). ` +
        `Prueba de vida: ${d.rostro.vida ? `superada (${d.rostro.desafios.join(' y ') || 'gestos'})` : 'incompleta'}.${d.rostro.alertas.length ? ' Alertas: ' + d.rostro.alertas.join('; ') : ''}`,
        'rostro_cedula', 'rostro_selfie', 'Foto de la cédula', 'Selfie con prueba de vida');
      bloque('3 · Firma manuscrita',
        `Parecido con la firma de la cédula: ${d.firma.parecido ?? '—'}/100 (${d.firma.veredicto || '—'}). Consistencia entre firmas: ${d.firma.consistencia ?? '—'}/100.` +
        `${d.firma.porFirma.length ? ` Puntaje por firma: ${d.firma.porFirma.join(' · ')}.` : ''}`,
        'firma_cedula', 'firma_dibujada', 'Firma impresa en la cédula', `Mejor firma dibujada en el teléfono (n.º ${d.firma.mejor + 1})`);

      // ── cédula ──
      h1('Cédula de identidad');
      ensure(150);
      { const y = doc.y; imagen('cedula_frente', M, y, colW, 130, 'Frente'); imagen('cedula_reverso', M + colW + 24, y, colW, 130, 'Reverso'); doc.y = y + 152; }

      // ── proceso, consentimiento e integridad ──
      h1('Proceso y consentimiento');
      fila('Inicio de la captura', fecha(d.inicio));
      fila('Término de la captura', fecha(d.fin));
      fila('Duración', res.duracion_ms ? `${Math.round(res.duracion_ms / 1000)} segundos` : '—');
      fila('Dispositivo', d.dispositivo || '—');
      fila('Consentimiento otorgado', v.consentimiento ? `${fecha(v.consentimiento.otorgado_en)} · versión ${v.consentimiento.version}` : '—');
      if (v.consentimiento_texto) { ensure(40); doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(C.ink2).text(`«${v.consentimiento_texto}»`, M, doc.y, { width: CW }); doc.moveDown(0.4); }

      h1('Integridad de la evidencia');
      fila('SHA-256 del paquete de evidencia', v.evidencia_sha256 || '—', { mono: true });
      fila('Verificación en servidor', v.integridad === 'ok' ? 'El paquete se descifró y su SHA-256 coincide con el declarado por el teléfono.' : `Resultado: ${v.integridad}`);
      fila('Resguardo', `Evidencia cifrada (AES-256-GCM) con clave única; se conserva hasta el ${v.retener_hasta ? new Date(v.retener_hasta).toLocaleDateString('es-CL') : '—'}.`);
      fila('Motores', [d.motores.huella, d.motores.rostro, d.motores.firma].filter(Boolean).join(' · ') || '—');

      h1('Historial de la validación');
      for (const e of historial) {
        ensure(14);
        const y = doc.y;
        doc.font('Courier').fontSize(8).fillColor(C.ink2).text(new Date(e.en).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), M, y, { width: 150, lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(C.ink).text(`${e.accion} · ${e.actor}${e.detalle?.motivo ? ` · «${e.detalle.motivo}»` : ''}`, M + 150, y, { width: CW - 150 });
        doc.y = Math.max(doc.y, y + 11) + 1;
      }

      ensure(60);
      doc.moveDown(1).font('Helvetica').fontSize(7.5).fillColor(C.ink3).text(
        'Este informe resume una validación de identidad realizada con la cámara de un teléfono, comparando la huella, el rostro y la firma de la persona con los impresos en su cédula de identidad. ' +
        'Constituye un antecedente de apoyo para procesos de firma electrónica simple (Ley 19.799) y no reemplaza a la firma electrónica avanzada. Las comparaciones biométricas no están certificadas por organismos externos. ' +
        `El folio ${folio} y la huella digital SHA-256 de este PDF quedan registrados en MatchOnCard para verificar su autenticidad.`, M, doc.y, { width: CW });

      // pie con folio y numeración
      const r = doc.bufferedPageRange();
      for (let i = r.start; i < r.start + r.count; i++) {
        doc.switchToPage(i);
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(7.5).fillColor(C.ink3).text(`${folio} · MatchOnCard · página ${i + 1} de ${r.count}`, M, doc.page.height - 36, { width: CW, align: 'center', lineBreak: false });
      }
      doc.end();
    });
  }
}
