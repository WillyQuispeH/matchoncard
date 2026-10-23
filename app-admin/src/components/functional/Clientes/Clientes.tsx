'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, type Columna } from '@/components/ui/Table';
import { fechaDia } from '@/utils/formato';
import { useCliente } from '@/store/hooks/useCliente.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import type { ICliente, ISecretosCliente, SecretoRotable } from '@/store/interfaces/cliente.interface';
import { FormCliente } from './FormCliente';
import { SecretosCliente } from './SecretosCliente';

type Abierto = { tipo: 'nuevo' } | { tipo: 'editar'; c: ICliente } | { tipo: 'secretos'; titulo: string; s: ISecretosCliente } | null;

const ROTAR: [SecretoRotable, string][] = [['jwt', 'Rotar secreto JWT'], ['webhook', 'Rotar secreto de webhook']];

export function Clientes() {
  const { lista, estadoLista, estadoAccion, errorAccion, clienteCrear, clienteActualizar, clienteRotar, clienteLimpiarAccion } = useCliente();
  const { panelDialogo, panelAviso } = usePanel();
  const [abierto, setAbierto] = useState<Abierto>(null);
  const cerrar = () => { clienteLimpiarAccion(); setAbierto(null); };

  // rotar invalida de inmediato el secreto anterior: se confirma con un motivo (queda en la auditoría)
  const rotar = (c: ICliente, secreto: SecretoRotable) => panelDialogo({
    tipo: 'motivo', peligro: true, accion: 'Rotar ahora', titulo: `Rotar secreto de ${c.nombre}`,
    texto: secreto === 'jwt'
      ? 'El secreto JWT actual deja de servir al tiro: la integración del cliente fallará hasta que configure el nuevo.'
      : 'El secreto de webhook actual deja de servir: el cliente debe verificar los próximos avisos con el nuevo.',
    alConfirmar: async (motivo) => {
      const s = await clienteRotar(c.id, secreto, motivo);
      if (!s) return errorAccion() || 'No se pudo rotar el secreto.';
      setAbierto({ tipo: 'secretos', titulo: 'Secreto nuevo', s });
      return null;
    },
  });
  const activar = async (c: ICliente) => {
    if (await clienteActualizar(c.id, { activo: !c.activo })) panelAviso(c.activo ? 'Cliente desactivado: su API deja de responder' : 'Cliente activado');
    else panelAviso(errorAccion() || 'No se pudo cambiar el estado');
  };

  const columnas: Columna<ICliente>[] = [
    { titulo: 'Cliente', celda: (c) => <><b>{c.nombre}</b><br /><span className="font-mono text-xs text-ink-3">{c.id}</span></> },
    { titulo: 'Roles', ocultarMovil: true, celda: (c) => <span className="font-mono text-xs text-ink-2">{c.roles.join(' · ')}</span> },
    { titulo: 'Validaciones 30 d', numerica: true, ocultarMovil: true, celda: (c) => c.validaciones_30d },
    { titulo: 'Documentos 30 d', numerica: true, ocultarMovil: true, celda: (c) => c.documentos_30d },
    { titulo: 'Webhooks fallidos', numerica: true, celda: (c) => (c.webhooks_fallidos ? <span className="text-bad">{c.webhooks_fallidos}</span> : '0') },
    { titulo: 'Estado', celda: (c) => <Badge tono={c.activo ? 'aprobada' : 'rechazada'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge> },
    { titulo: 'Desde', ocultarMovil: true, celda: (c) => <span className="font-mono text-[13px]">{fechaDia(c.creado_en)}</span> },
    { titulo: 'Acciones', celda: (c) => (
      <div className="flex flex-wrap gap-1.5">
        <Button tamano="sm" onClick={() => setAbierto({ tipo: 'editar', c })}>Editar</Button>
        {ROTAR.map(([k, t]) => <Button key={k} tamano="sm" variante="ghost" onClick={() => rotar(c, k)}>{t}</Button>)}
        <Button tamano="sm" variante={c.activo ? 'danger' : 'default'} disabled={estadoAccion.onLoading} onClick={() => void activar(c)}>{c.activo ? 'Desactivar' : 'Activar'}</Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader sobretitulo="INTEGRACIONES" titulo="Clientes">
        <Button variante="primary" onClick={() => setAbierto({ tipo: 'nuevo' })}>+ Nuevo cliente</Button>
      </PageHeader>
      <p className="max-w-[80ch] text-sm text-ink-3">
        Cada cliente se autentica con la cabecera <code className="font-mono text-ink-2">id</code> y un JWT de vida corta firmado con su secreto, y recibe los webhooks firmados con su secreto de webhook.
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <Table columnas={columnas} filas={estadoLista.error ? [] : lista} clave={(c) => c.id} vacio={estadoLista.error || (lista ? 'Aún no hay clientes.' : 'Cargando…')} />
      </div>

      {(abierto?.tipo === 'nuevo' || abierto?.tipo === 'editar') && (
        <FormCliente cliente={abierto.tipo === 'editar' ? abierto.c : undefined} error={estadoAccion.error} enviando={estadoAccion.onLoading} alCerrar={cerrar}
          alGuardar={async (d) => {
            if (abierto.tipo === 'editar') {
              if (await clienteActualizar(abierto.c.id, { nombre: d.nombre, roles: d.roles })) { panelAviso('Cliente actualizado'); cerrar(); }
            } else {
              const s = await clienteCrear(d);
              if (s) setAbierto({ tipo: 'secretos', titulo: `Cliente ${d.nombre} creado`, s });
            }
          }} />
      )}
      {abierto?.tipo === 'secretos' && <SecretosCliente titulo={abierto.titulo} secretos={abierto.s} alCopiar={() => panelAviso('Copiado')} alCerrar={cerrar} />}
    </>
  );
}
