'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FileDrop } from '@/components/ui/FileDrop';
import { InputText } from '@/components/ui/InputText';
import { Spinner } from '@/components/ui/Spinner';
import { HojaPdf } from './HojaPdf';
import { ListaFirmantes } from './ListaFirmantes';
import { useEditorDocumento } from './useEditorDocumento';

// Pantalla completa: subir PDF, agregar firmantes y ubicar sus firmas
export function EditorDocumento() {
  const ed = useEditorDocumento();
  const hojas = useRef<HTMLDivElement>(null);
  const [anchoHojas, setAnchoHojas] = useState(800);
  const [seguro, setSeguro] = useState(false);   // segundo clic en "Cerrar" para descartar

  useEffect(() => {
    const el = hojas.current; if (!el) return;
    const ro = new ResizeObserver(() => setAnchoHojas(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => { if (!seguro) return; const t = setTimeout(() => setSeguro(false), 3000); return () => clearTimeout(t); }, [seguro]);

  const cerrar = () => { if (ed.sinCambios || seguro) ed.cerrar(); else setSeguro(true); };
  const escala = (ancho: number) => Math.min(1.5, Math.max(320, anchoHojas - 48) / ancho);

  return (
    <div className="fixed inset-0 z-[25] grid grid-rows-[60px_1fr] bg-bg">
      <div className="flex items-center gap-3 border-b border-line px-5">
        <h2 className="text-xl">Nuevo documento</h2>
        <span className="text-sm text-ink-3">{ed.archivo && `${ed.archivo} · ${ed.paginas.length} página${ed.paginas.length > 1 ? 's' : ''}`}</span>
        <Button variante={seguro ? 'danger' : 'ghost'} className="ml-auto" onClick={cerrar}>{seguro ? '¿Descartar? Clic de nuevo' : 'Cerrar'}</Button>
      </div>
      <div className="grid min-h-0 grid-cols-[360px_1fr] max-[860px]:grid-cols-1 max-[860px]:grid-rows-[auto_1fr]">
        <div className="grid content-start gap-4 overflow-y-auto border-r border-line p-5 max-[860px]:max-h-[46vh] max-[860px]:border-b max-[860px]:border-r-0">
          <FileDrop alElegir={(f) => void ed.cargarArchivo(f)} className="rounded-xl border-[1.5px] border-dashed border-line-2 px-3 py-[26px] text-ink-2 hover:border-accent">
            <b>Elegir PDF</b><span className="text-[13px] text-ink-3">o arrástralo aquí · máx. 25 MB</span>
          </FileDrop>
          <InputText etiqueta="Nombre del documento" maxLength={200} placeholder="Contrato de arriendo" value={ed.nombre} onChange={(e) => ed.setNombre(e.target.value)} />
          <InputText etiqueta="Referencia (opcional)" maxLength={120} placeholder="N.º de operación, folio…" value={ed.referencia} onChange={(e) => ed.setReferencia(e.target.value)} />
          <div className="grid gap-2">
            <span className="text-[13px] font-medium text-ink-2">Orden de firma</span>
            <div className="grid grid-cols-2 rounded-[10px] border border-line-2 bg-sunken p-[3px]">
              {(['libre', 'secuencial'] as const).map((o) => (
                <button key={o} onClick={() => ed.setOrden(o)}
                  className={`rounded-lg border-0 p-2 font-semibold ${ed.orden === o ? 'bg-surface text-ink' : 'bg-transparent text-ink-2'}`}>{o === 'libre' ? 'Libre' : 'Secuencial'}</button>
              ))}
            </div>
            <span className="text-[13px] text-ink-3">
              {ed.orden === 'libre' ? 'Todos reciben su link de inmediato y firman en cualquier orden.' : 'Firman en el orden de la lista: cada uno recibe su link cuando firma el anterior.'}
            </span>
          </div>
          <ListaFirmantes ed={ed} />
          <ErrorMessage mensaje={ed.error} />
          <Button variante="primary" disabled={ed.guardando} onClick={() => void ed.guardar()}>{ed.guardando ? 'Sellando el documento…' : 'Registrar y crear links'}</Button>
          <p className="text-[13px] text-ink-3">Al registrar, el PDF queda sellado: después solo admite las firmas electrónicas de estos firmantes.</p>
        </div>
        <div ref={hojas} className="grid content-start justify-center gap-6 overflow-auto bg-deep p-6 pt-8">
          {ed.abriendo ? <Spinner texto="Abriendo el PDF…" />
            : ed.doc ? ed.paginas.map((p) => <HojaPdf key={p.n} doc={ed.doc!} pagina={p} total={ed.paginas.length} escala={escala(p.ancho)} ed={ed} />)
              : <p className="mt-20 text-ink-3">Sube un PDF para ver sus páginas aquí.</p>}
        </div>
      </div>
    </div>
  );
}
