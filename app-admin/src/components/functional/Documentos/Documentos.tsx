'use client';
import { useEffect } from 'react';
import { config } from '@/utils/config';
import { useCliente } from '@/store/hooks/useCliente.hook';
import { ClienteSelector } from '../Shell/ClienteSelector';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, type Columna } from '@/components/ui/Table';
import { fechaCorta } from '@/utils/formato';
import { ESTADOS } from '@/utils/textos';
import { useDocumento } from '@/store/hooks/useDocumento.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import type { IDocumentoFila } from '@/store/interfaces/documento.interface';
import { PageHeader } from '@/components/layout/PageHeader';

const COLUMNAS: Columna<IDocumentoFila>[] = [
  { titulo: 'Fecha', celda: (d) => <span className="font-mono text-[13px]">{fechaCorta(d.creado_en)}</span> },
  { titulo: 'Documento', celda: (d) => d.nombre },
  { titulo: 'Referencia', ocultarMovil: true, clase: 'text-ink-3', celda: (d) => d.referencia || '—' },
  { titulo: 'Orden', ocultarMovil: true, clase: 'text-ink-3', celda: (d) => (d.orden === 'secuencial' ? 'Secuencial' : 'Libre') },
  { titulo: 'Firmas', numerica: true, celda: (d) => `${d.firmados}/${d.firmantes}` },
  { titulo: 'Estado', celda: (d) => <Badge tono={d.estado}>{ESTADOS[d.estado] || d.estado}</Badge> },
];

export function Documentos() {
  const { lista, estadoLista, documentoListar } = useDocumento();
  const { lateral, dialogo, editor, panelLateral, panelEditor } = usePanel();
  const { actual } = useCliente();

  useEffect(() => { if (actual) void documentoListar(); }, [actual, documentoListar]);
  useEffect(() => {
    if (lateral || dialogo || editor) return;
    const t = setInterval(() => void documentoListar(), config.refrescoMs);
    return () => clearInterval(t);
  }, [lateral, dialogo, editor, documentoListar]);

  return (
    <>
      <PageHeader sobretitulo="FIRMA ELECTRÓNICA" titulo="Documentos">
        <ClienteSelector />
        <Button variante="primary" onClick={() => panelEditor(true)}>+ Nuevo documento</Button>
      </PageHeader>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <Table columnas={COLUMNAS} filas={estadoLista.error ? [] : lista} clave={(d) => d.id} alElegir={(d) => panelLateral({ tipo: 'documento', id: d.id })}
          vacio={estadoLista.error || (lista ? 'Aún no hay documentos. Usa “+ Nuevo documento” para subir un PDF y ubicar las firmas.' : 'Cargando…')} />
      </div>
    </>
  );
}
