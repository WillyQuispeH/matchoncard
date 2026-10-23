'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, type ItemMenu } from '@/components/layout/Sidebar';
import { Drawer } from '@/components/ui/Drawer';
import { Spinner } from '@/components/ui/Spinner';
import { Toast } from '@/components/ui/Toast';
import { useAuth } from '@/store/hooks/useAuth.hook';
import { useCliente } from '@/store/hooks/useCliente.hook';
import { usePanel } from '@/store/hooks/usePanel.hook';
import { useValidacion } from '@/store/hooks/useValidacion.hook';
import { useDocumento } from '@/store/hooks/useDocumento.hook';
import { DetalleValidacion } from '../Validaciones/DetalleValidacion';
import { DetalleDocumento } from '../Documentos/DetalleDocumento';
import { EditorDocumento } from '../Documentos/Editor/EditorDocumento';
import { Dialogos } from './Dialogos';
import { Login } from './Login';

const MENU: (ItemMenu & { superadmin?: boolean })[] = [
  { seccion: 'Operación', href: '/validaciones', texto: 'Validaciones' },
  { seccion: 'Operación', href: '/documentos', texto: 'Documentos' },
  { seccion: 'Operación', href: '/webhooks', texto: 'Webhooks' },
  { seccion: 'Administración', href: '/clientes', texto: 'Clientes', superadmin: true },
  { seccion: 'Administración', href: '/usuarios', texto: 'Usuarios', superadmin: true },
  { seccion: 'Sistema', href: '/auditoria', texto: 'Auditoría' },
  { seccion: 'Sistema', href: '/estado', texto: 'Estado' },
];

// Puerta de app-admin: pregunta a la API si hay sesión (cookie httpOnly) y muestra el ingreso o la aplicación.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, revisada, authYo, authLogout } = useAuth();
  const { clienteListar } = useCliente();
  const { lateral, editor, aviso, panelLateral } = usePanel();
  const { validacionCerrar } = useValidacion();
  const { documentoCerrar } = useDocumento();
  const ruta = usePathname();

  useEffect(() => { void authYo(); }, [authYo]);
  useEffect(() => { if (admin) void clienteListar(); }, [admin, clienteListar]);

  if (!revisada) return <div className="grid min-h-screen place-items-center"><Spinner texto="Cargando…" /></div>;
  if (!admin) return <Login />;

  const cerrarLateral = () => { panelLateral(null); validacionCerrar(); documentoCerrar(); };
  const items = MENU.filter((i) => !i.superadmin || admin.rol === 'superadmin');

  return (
    <div className="flex min-h-screen text-[15px] leading-normal max-[900px]:flex-col">
      <Sidebar items={items} activo={ruta} usuario={admin.usuario} rol={admin.rol} alSalir={() => void authLogout()} />
      <main className="grid min-w-0 flex-1 content-start gap-5 px-6 pb-16 pt-6 max-[560px]:px-4">{children}</main>
      {editor && <EditorDocumento />}
      {lateral && (
        <Drawer etiqueta={lateral.tipo === 'validacion' ? 'Detalle de la validación' : 'Detalle del documento'} alCerrar={cerrarLateral}>
          {lateral.tipo === 'validacion' ? <DetalleValidacion id={lateral.id} alCerrar={cerrarLateral} /> : <DetalleDocumento id={lateral.id} alCerrar={cerrarLateral} />}
        </Drawer>
      )}
      <Dialogos />
      <Toast texto={aviso} />
    </div>
  );
}
