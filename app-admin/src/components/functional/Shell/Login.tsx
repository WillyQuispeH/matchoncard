'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { InputText } from '@/components/ui/InputText';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/store/hooks/useAuth.hook';

export function Login() {
  const { estado, authLogin } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await authLogin({ usuario, clave })) setClave('');
  };
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={enviar} autoComplete="on" className="grid w-full max-w-[380px] gap-4 rounded-[20px] border border-line bg-surface px-7 py-8">
        <span className="text-xl"><Logo texto="Panel" /></span>
        <InputText etiqueta="Usuario" name="usuario" autoComplete="username" required autoFocus value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        <InputText etiqueta="Clave" name="clave" type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        <ErrorMessage mensaje={estado.error} reservar />
        <Button type="submit" variante="primary" disabled={estado.onLoading}>Ingresar</Button>
      </form>
    </div>
  );
}
