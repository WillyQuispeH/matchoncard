export function Toast({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <div role="status" className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-line-2 bg-surface px-4 py-2.5 text-sm">
      {texto}
    </div>
  );
}
