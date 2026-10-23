'use client';
import { useAuth } from '@/store/hooks/useAuth.hook';

// Páginas de administración: un operador que entre por URL ve un aviso (la API igual responde 403)
export function SoloSuperadmin({ children }: { children: React.ReactNode }) {
  const { admin } = useAuth();
  if (admin?.rol !== 'superadmin') return <p className="text-ink-2">Esta sección es solo para usuarios superadmin.</p>;
  return <>{children}</>;
}
