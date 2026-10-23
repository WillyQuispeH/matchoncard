export function Spinner({ texto }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-ink-2">
      <span className="size-4 animate-spin rounded-full border-2 border-line-2 border-t-accent" aria-hidden="true" />
      {texto}
    </div>
  );
}
