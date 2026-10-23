'use client';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { Table, type Columna } from '@/components/ui/Table';
import { fechaCorta } from '@/utils/formato';
import { useAuth } from '@/store/hooks/useAuth.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import { useUsuario } from '@/store/hooks/useUsuario.hook';
import type { IUsuario } from '@/store/interfaces/usuario.interface';
import { FormUsuario } from './FormUsuario';

const bloqueado = (u: IUsuario) => !!u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date();

export function Usuarios() {
  const { admin } = useAuth();
  const { lista, estadoLista, estadoAccion, errorAccion, usuarioListar, usuarioCrear, usuarioActualizar, usuarioClave, usuarioDesbloquear, usuarioLimpiarAccion } = useUsuario();
  const { panelAviso } = usePanel();
  const [form, setForm] = useState<{ usuario?: string } | null>(null);
  useEffect(() => { void usuarioListar(); }, [usuarioListar]);
  const cerrar = () => { usuarioLimpiarAccion(); setForm(null); };

  // acciones de una fila: el resultado se avisa abajo (o el error de la API)
  const hacer = async (ok: Promise<boolean>, texto: string) => panelAviso((await ok) ? texto : errorAccion() || 'No se pudo completar');

  const columnas: Columna<IUsuario>[] = [
    { titulo: 'Usuario', celda: (u) => <><b>{u.usuario}</b>{u.usuario === admin?.usuario && <span className="ml-2 text-xs text-ink-3">(tú)</span>}</> },
    { titulo: 'Rol', celda: (u) => <span className="font-mono text-[13px]">{u.rol}</span> },
    { titulo: 'Estado', celda: (u) => (
      !u.activo ? <Badge tono="rechazada">Inactivo</Badge> : bloqueado(u) ? <Badge tono="revision">Bloqueado</Badge> : <Badge tono="aprobada">Activo</Badge>
    ) },
    { titulo: 'Último ingreso', ocultarMovil: true, celda: (u) => <span className="font-mono text-[13px]">{fechaCorta(u.ultimo_ingreso)}</span> },
    { titulo: 'Sesiones', numerica: true, ocultarMovil: true, celda: (u) => u.sesiones_abiertas },
    { titulo: 'Acciones', celda: (u) => {
      const yo = u.usuario === admin?.usuario;
      return (
        <div className="flex flex-wrap gap-1.5">
          <Button tamano="sm" onClick={() => setForm({ usuario: u.usuario })}>Cambiar clave</Button>
          {!yo && <Button tamano="sm" variante="ghost" disabled={estadoAccion.onLoading}
            onClick={() => void hacer(usuarioActualizar(u.usuario, { rol: u.rol === 'superadmin' ? 'operador' : 'superadmin' }), 'Rol cambiado')}>
            {u.rol === 'superadmin' ? 'Pasar a operador' : 'Hacer superadmin'}</Button>}
          {bloqueado(u) && <Button tamano="sm" variante="ghost" onClick={() => void hacer(usuarioDesbloquear(u.usuario), 'Usuario desbloqueado')}>Desbloquear</Button>}
          {!yo && <Button tamano="sm" variante={u.activo ? 'danger' : 'default'} disabled={estadoAccion.onLoading}
            onClick={() => void hacer(usuarioActualizar(u.usuario, { activo: !u.activo }), u.activo ? 'Usuario desactivado' : 'Usuario activado')}>
            {u.activo ? 'Desactivar' : 'Activar'}</Button>}
        </div>
      );
    } },
  ];

  return (
    <>
      <PageHeader sobretitulo="ACCESO A APP-ADMIN" titulo="Usuarios">
        <Button variante="primary" onClick={() => setForm({})}>+ Nuevo usuario</Button>
      </PageHeader>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <Table columnas={columnas} filas={estadoLista.error ? [] : lista} clave={(u) => u.usuario} vacio={estadoLista.error || (lista ? 'Aún no hay usuarios.' : 'Cargando…')} />
      </div>
      {!form && <ErrorMessage mensaje={estadoAccion.error} />}
      {form && (
        <FormUsuario usuario={form.usuario} error={estadoAccion.error} enviando={estadoAccion.onLoading} alCerrar={cerrar}
          alGuardar={async (d) => {
            const ok = form.usuario ? await usuarioClave(form.usuario, d.clave) : await usuarioCrear(d);
            if (ok) { panelAviso(form.usuario ? 'Clave cambiada' : `Usuario ${d.usuario} creado`); cerrar(); }
          }} />
      )}
    </>
  );
}
