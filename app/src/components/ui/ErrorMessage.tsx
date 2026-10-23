export function ErrorMessage({ mensaje, reservar = false }: { mensaje?: string | null; reservar?: boolean }) {
  if (!mensaje && !reservar) return null;
  return <p role="alert" className={`text-sm text-bad ${reservar ? 'min-h-5' : ''}`}>{mensaje}</p>;
}
