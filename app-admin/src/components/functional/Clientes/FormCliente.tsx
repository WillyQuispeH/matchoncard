'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckGroup } from '@/components/ui/CheckGroup';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InputText } from '@/components/ui/InputText';
import { Modal } from '@/components/ui/Modal';
import type { ICliente, RolCliente } from '@/store/interfaces/cliente.interface';

export const ROLES_CLIENTE: [RolCliente, string, string][] = [
  ['integracion', 'Integración', 'Crear validaciones y documentos, consultar su estado'],
  ['auditor', 'Auditor', 'Descargar la evidencia (cada descarga queda auditada)'],
  ['dpo', 'DPO', 'Derechos del titular: consultar por RUT y suprimir datos'],
];

interface Props {
  cliente?: ICliente;               // sin cliente: crear
  error: string | null;
  enviando: boolean;
  alGuardar: (d: { id: string; nombre: string; roles: RolCliente[] }) => void;
  alCerrar: () => void;
}

export function FormCliente({ cliente, error, enviando, alGuardar, alCerrar }: Props) {
  const [id, setId] = useState(cliente?.id || '');
  const [nombre, setNombre] = useState(cliente?.nombre || '');
  const [roles, setRoles] = useState<RolCliente[]>(cliente?.roles || ['integracion']);
  return (
    <Modal titulo={cliente ? `Editar ${cliente.nombre}` : 'Nuevo cliente'} alCerrar={alCerrar}>
      <form className="grid gap-3.5" onSubmit={(e) => { e.preventDefault(); alGuardar({ id: id.trim(), nombre: nombre.trim(), roles }); }}>
        {!cliente && (
          <InputText etiqueta="Id (valor de la cabecera id; no se puede cambiar)" required placeholder="portalfirma" autoFocus autoComplete="off"
            value={id} onChange={(e) => setId(e.target.value.toLowerCase())} />
        )}
        <InputText etiqueta="Nombre" required maxLength={120} placeholder="Portalfirma" autoFocus={!!cliente} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <CheckGroup etiqueta="Roles" opciones={ROLES_CLIENTE} valor={roles} alCambiar={setRoles} />
        <ErrorMessage mensaje={error} reservar />
        <div className="flex justify-end gap-2.5">
          <Button variante="ghost" onClick={alCerrar}>Cancelar</Button>
          <Button type="submit" variante="primary" disabled={enviando || !roles.length}>{cliente ? 'Guardar' : 'Crear y ver secretos'}</Button>
        </div>
      </form>
    </Modal>
  );
}
