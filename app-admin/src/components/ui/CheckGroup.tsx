// Grupo de casillas (por ejemplo, los roles de un cliente)
interface Props<T extends string> { opciones: [T, string, string?][]; valor: T[]; alCambiar: (v: T[]) => void; etiqueta?: string }

export function CheckGroup<T extends string>({ opciones, valor, alCambiar, etiqueta }: Props<T>) {
  return (
    <fieldset className="m-0 grid gap-2 border-0 p-0">
      {etiqueta && <legend className="mb-1.5 text-[13px] font-medium text-ink-2">{etiqueta}</legend>}
      {opciones.map(([v, t, ayuda]) => (
        <label key={v} className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-line-2 bg-sunken px-3 py-2.5">
          <input type="checkbox" className="mt-1 accent-[var(--color-accent)]" checked={valor.includes(v)}
            onChange={(e) => alCambiar(e.target.checked ? [...valor, v] : valor.filter((x) => x !== v))} />
          <span><b className="text-sm">{t}</b>{ayuda && <small className="block text-ink-3">{ayuda}</small>}</span>
        </label>
      ))}
    </fieldset>
  );
}
