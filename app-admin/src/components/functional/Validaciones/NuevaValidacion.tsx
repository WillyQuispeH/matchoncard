'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InputText } from '@/components/ui/InputText';
import { Modal } from '@/components/ui/Modal';
import { usePanel } from '@/store/hooks/usePanel.hook';
import { useValidacion } from '@/store/hooks/useValidacion.hook';
import type { INuevaValidacion } from '@/store/interfaces/validacion.interface';

export function NuevaValidacion() {
  const { estadoAccion, validacionCrear, validacionLimpiarAccion } = useValidacion();
  const { panelDialogo } = usePanel();
  const [f, setF] = useState({ rut: '', nombre: '', documento_id: '' });
  const cerrar = () => { validacionLimpiarAccion(); panelDialogo(null); };
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const d: INuevaValidacion = { rut: f.rut.trim() };
    if (f.nombre.trim()) d.nombre = f.nombre.trim();
    if (f.documento_id.trim()) d.documento_id = f.documento_id.trim();
    const r = await validacionCrear(d);
    if (r) panelDialogo({ tipo: 'linkCreado', validacion: r, nombre: d.nombre });
  };
  const campo = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }), autoComplete: 'off' });
  return (
    <Modal titulo="Nueva validación" alCerrar={cerrar}>
      <form onSubmit={enviar} className="grid gap-3.5">
        <InputText etiqueta="RUT del firmante" required placeholder="12.345.678-5" autoFocus {...campo('rut')} />
        <InputText etiqueta="Nombre (aparece en el saludo)" maxLength={160} {...campo('nombre')} />
        <InputText etiqueta="Documento o referencia (opcional)" maxLength={80} {...campo('documento_id')} />
        <ErrorMessage mensaje={estadoAccion.error} reservar />
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variante="ghost" onClick={cerrar}>Cancelar</Button>
          <Button type="submit" variante="primary" disabled={estadoAccion.onLoading}>Crear link</Button>
        </div>
      </form>
    </Modal>
  );
}
