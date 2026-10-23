'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InputSelect } from '@/components/ui/InputSelect';
import { InputText } from '@/components/ui/InputText';
import { Modal } from '@/components/ui/Modal';
import { config } from '@/utils/config';
import type { RolAdmin } from '@/store/interfaces/auth.interface';

export const ROLES_ADMIN: [RolAdmin, string][] = [
  ['operador', 'Operador: validaciones, documentos, webhooks y auditoría'],
  ['superadmin', 'Superadmin: además, clientes y usuarios'],
];

interface Props {
  usuario?: string;                 // con usuario: solo cambiar la clave
  error: string | null;
  enviando: boolean;
  alGuardar: (d: { usuario: string; clave: string; rol: RolAdmin }) => void;
  alCerrar: () => void;
}

export function FormUsuario({ usuario, error, enviando, alGuardar, alCerrar }: Props) {
  const [nombre, setNombre] = useState(usuario || '');
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [rol, setRol] = useState<RolAdmin>('operador');
  const [local, setLocal] = useState<string | null>(null);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (clave.length < config.minClave) { setLocal(`La clave debe tener al menos ${config.minClave} caracteres.`); return; }
    if (clave !== repetir) { setLocal('Las claves no coinciden.'); return; }
    setLocal(null);
    alGuardar({ usuario: nombre.trim(), clave, rol });
  };
  return (
    <Modal titulo={usuario ? `Cambiar clave de ${usuario}` : 'Nuevo usuario'} alCerrar={alCerrar}>
      <form className="grid gap-3.5" onSubmit={enviar} autoComplete="off">
        {!usuario && <InputText etiqueta="Usuario" required autoFocus maxLength={40} value={nombre} onChange={(e) => setNombre(e.target.value)} />}
        <InputText etiqueta={`Clave (mínimo ${config.minClave} caracteres)`} type="password" required autoFocus={!!usuario} autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
        <InputText etiqueta="Repetir clave" type="password" required autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
        {!usuario && (
          <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">Rol
            <InputSelect opciones={ROLES_ADMIN} value={rol} onChange={(e) => setRol(e.target.value as RolAdmin)} />
          </label>
        )}
        {usuario && <p className="text-[13px] text-ink-3">Las sesiones abiertas de este usuario se cierran al cambiar la clave.</p>}
        <ErrorMessage mensaje={local || error} reservar />
        <div className="flex justify-end gap-2.5">
          <Button variante="ghost" onClick={alCerrar}>Cancelar</Button>
          <Button type="submit" variante="primary" disabled={enviando}>{usuario ? 'Cambiar clave' : 'Crear usuario'}</Button>
        </div>
      </form>
    </Modal>
  );
}
