'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { config } from '@/utils/config';
import { useCliente } from '@/store/hooks/useCliente.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import { useValidacion } from '@/store/hooks/useValidacion.hook';
import { PageHeader } from '@/components/layout/PageHeader';
import { ClienteSelector } from '../Shell/ClienteSelector';
import { FiltrosValidaciones } from './FiltrosValidaciones';
import { ResumenEstados } from './ResumenEstados';
import { TablaValidaciones } from './TablaValidaciones';

export function Validaciones() {
  const { resumen, lista, filtro, estadoLista, validacionFiltrar, validacionListar, validacionResumen } = useValidacion();
  const { lateral, dialogo, panelLateral, panelDialogo } = usePanel();
  const { actual } = useCliente();

  // al cambiar de cliente se recarga desde la primera página
  useEffect(() => { if (actual) void validacionFiltrar({ pagina: 1 }); }, [actual, validacionFiltrar]);
  // refresco cada 30 s mientras no haya nada abierto encima de la lista
  useEffect(() => {
    if (lateral || dialogo) return;
    const t = setInterval(() => { void validacionListar(); void validacionResumen(); }, config.refrescoMs);
    return () => clearInterval(t);
  }, [lateral, dialogo, validacionListar, validacionResumen]);

  return (
    <>
      <PageHeader sobretitulo="ÚLTIMOS 30 DÍAS" titulo="Validaciones">
        <ClienteSelector />
        <Button variante="primary" onClick={() => panelDialogo({ tipo: 'nuevaValidacion' })}>+ Nueva validación</Button>
      </PageHeader>
      <ResumenEstados resumen={resumen} estado={filtro.estado} alElegir={(estado) => void validacionFiltrar({ estado })} />
      <FiltrosValidaciones rut={filtro.rut} estado={filtro.estado} alBuscar={(f) => void validacionFiltrar(f)} />
      <TablaValidaciones lista={lista} error={estadoLista.error} alElegir={(id) => panelLateral({ tipo: 'validacion', id })}
        alPaginar={(pagina) => void validacionFiltrar({ pagina })} />
    </>
  );
}
