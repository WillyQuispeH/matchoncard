'use client';
import { useCallback, useRef, useState } from 'react';
import { config } from '@/utils/config';
import { base64, rutNormal, rutValido } from '@/utils/formato';
import { CAJA, COLORES } from '@/utils/textos';
import { useDocumento } from '@/store/hooks/useDocumento.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import type { IUbicacion } from '@/store/interfaces/documento.interface';
import { cargarPdfjs, type PdfDocumento } from './pdfjs';

// Estado local del editor de un documento nuevo: PDF, firmantes y sus recuadros (en puntos PDF).

export interface Caja extends IUbicacion { id: number }
export interface FirmanteEditor { nombre: string; rut: string; color: string; cajas: Caja[] }
export interface PaginaPdf { n: number; ancho: number; alto: number }   // tamaño de la página en puntos

export const choca = (a: IUbicacion, b: IUbicacion) =>
  a.pagina === b.pagina && a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
const r2 = (v: number) => Math.round(v * 100) / 100;
let siguienteId = 1;

export function useEditorDocumento() {
  const { estadoAccion, documentoCrear, documentoLimpiarAccion } = useDocumento();
  const { panelEditor, panelDialogo, panelAviso } = usePanel();
  const [pdf, setPdf] = useState<string | null>(null);                 // base64 para la API
  const [doc, setDoc] = useState<PdfDocumento | null>(null);           // para dibujar las páginas
  const [paginas, setPaginas] = useState<PaginaPdf[]>([]);
  const [archivo, setArchivo] = useState('');
  const [nombre, setNombre] = useState('');
  const [referencia, setReferencia] = useState('');
  const [orden, setOrden] = useState<'libre' | 'secuencial'>('libre');
  const [firmantes, setFirmantes] = useState<FirmanteEditor[]>([]);
  const [activo, setActivo] = useState(-1);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const docRef = useRef<PdfDocumento | null>(null);

  // por id (no por referencia): durante un arrastre la caja del estado ya puede ser un objeto nuevo
  const todas = (excepto?: Caja) => firmantes.flatMap((f) => f.cajas).filter((c) => c.id !== excepto?.id);

  const cargarArchivo = useCallback(async (file: File) => {
    setError(null);
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { setError('El archivo debe ser PDF.'); return; }
    if (file.size > config.maxPdfBytes) { setError('El PDF supera 25 MB.'); return; }
    const u8 = new Uint8Array(await file.arrayBuffer());
    setAbriendo(true);
    try {
      const lib = await cargarPdfjs();
      const d = await lib.getDocument({ data: u8.slice() }).promise;
      const pags: PaginaPdf[] = [];
      for (let n = 1; n <= d.numPages; n++) { const v = (await d.getPage(n)).getViewport({ scale: 1 }); pags.push({ n, ancho: v.width, alto: v.height }); }
      await docRef.current?.destroy();
      docRef.current = d;
      setDoc(d); setPaginas(pags); setPdf(base64(u8)); setArchivo(file.name);
      setNombre((x) => x || file.name.replace(/\.pdf$/i, '').slice(0, 200));
      setFirmantes((fs) => fs.map((f) => ({ ...f, cajas: [] })));   // un PDF nuevo invalida las ubicaciones
    } catch (e) {
      setError(`No se pudo abrir el PDF: ${(e as Error).message}`); setPdf(null); setDoc(null); setPaginas([]);
    } finally { setAbriendo(false); }
  }, []);

  // devuelve un mensaje de error o null si se agregó
  const agregarFirmante = (n: string, rut: string): string | null => {
    if (n.trim().length < 3) return 'Escribe el nombre del firmante.';
    if (!rutValido(rut)) return 'RUT inválido (revisa el dígito verificador).';
    if (firmantes.some((f) => rutNormal(f.rut) === rutNormal(rut))) return 'Ese RUT ya está en la lista.';
    setFirmantes([...firmantes, { nombre: n.trim(), rut: rut.trim(), color: COLORES[firmantes.length % COLORES.length], cajas: [] }]);
    setActivo(firmantes.length);
    return null;
  };

  const quitarFirmante = (i: number) => {
    const fs = firmantes.filter((_, k) => k !== i).map((f, k) => ({ ...f, color: COLORES[k % COLORES.length] }));
    setFirmantes(fs);
    setActivo(Math.min(activo, fs.length - 1));
  };

  // clic en la página: recuadro centrado en el punto, dentro de la hoja y sin chocar con otro
  const ponerCaja = (pagina: PaginaPdf, x: number, y: number) => {
    if (activo < 0) { panelAviso('Primero agrega un firmante'); return; }
    const c: Caja = {
      id: siguienteId++, pagina: pagina.n, ancho: CAJA.ancho, alto: CAJA.alto,
      x: Math.max(0, Math.min(pagina.ancho - CAJA.ancho, x - CAJA.ancho / 2)),
      y: Math.max(0, Math.min(pagina.alto - CAJA.alto, y - CAJA.alto / 2)),
    };
    if (todas().some((o) => choca(o, c))) { panelAviso('Se superpone con otro recuadro'); return; }
    setFirmantes(firmantes.map((f, i) => (i === activo ? { ...f, cajas: [...f.cajas, c] } : f)));
  };

  // mover o redimensionar: se rechaza si choca con otro recuadro
  const cambiarCaja = (fi: number, actual: Caja, nueva: Caja): boolean => {
    if (todas(actual).some((o) => choca(o, nueva))) return false;
    setFirmantes((fs) => fs.map((f, i) => (i === fi ? { ...f, cajas: f.cajas.map((c) => (c.id === actual.id ? nueva : c)) } : f)));
    return true;
  };

  const quitarCaja = (fi: number, c: Caja) =>
    setFirmantes(firmantes.map((f, i) => (i === fi ? { ...f, cajas: f.cajas.filter((x) => x.id !== c.id) } : f)));

  const cerrar = () => { void docRef.current?.destroy(); docRef.current = null; documentoLimpiarAccion(); panelEditor(false); };

  const guardar = async () => {
    setError(null);
    const n = nombre.trim();
    if (!pdf) { setError('Sube el PDF.'); return; }
    if (!n) { setError('Escribe el nombre del documento.'); return; }
    if (!firmantes.length) { setError('Agrega al menos un firmante.'); return; }
    const sin = firmantes.find((f) => !f.cajas.length);
    if (sin) { setError(`Ubica la firma de ${sin.nombre} en el documento.`); return; }
    const r = await documentoCrear({
      nombre: n, pdf, orden,
      ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
      firmantes: firmantes.map((f) => ({ nombre: f.nombre, rut: f.rut, ubicaciones: f.cajas.map((c) => ({ pagina: c.pagina, x: r2(c.x), y: r2(c.y), ancho: r2(c.ancho), alto: r2(c.alto) })) })),
    });
    if (!r) return;
    cerrar();
    panelDialogo({ tipo: 'enlaces', datos: {
      titulo: 'Documento registrado', documento: r.nombre,
      nota: r.orden === 'secuencial' ? 'Envía el link al primer firmante; los demás lo recibirán por turno.' : 'Envía a cada firmante su link.',
      items: r.enlaces_firmantes.map((x) => ({ nombre: x.nombre, url: x.url_captura, expira: x.expira_en })),
    } });
  };

  return {
    doc, paginas, archivo, nombre, referencia, orden, firmantes, activo, abriendo, guardando: estadoAccion.onLoading,
    error: error || estadoAccion.error, sinCambios: !pdf && !firmantes.length,
    setNombre, setReferencia, setOrden, setActivo,
    cargarArchivo, agregarFirmante, quitarFirmante, ponerCaja, cambiarCaja, quitarCaja, guardar, cerrar,
  };
}

export type EditorDocumento = ReturnType<typeof useEditorDocumento>;
