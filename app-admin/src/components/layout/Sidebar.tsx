import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export interface ItemMenu { href: string; texto: string; seccion: string }

interface Props { items: ItemMenu[]; activo: string; usuario: string; rol: string; alSalir: () => void }

// Menú lateral (en pantallas angostas pasa a ser una barra superior con desplazamiento)
export function Sidebar({ items, activo, usuario, rol, alSalir }: Props) {
  const secciones = [...new Set(items.map((i) => i.seccion))];
  return (
    <aside className="sticky top-0 flex h-screen w-[232px] flex-none flex-col gap-6 border-r border-line bg-sunken px-4 py-5
      max-[900px]:static max-[900px]:h-auto max-[900px]:w-full max-[900px]:flex-row max-[900px]:items-center max-[900px]:gap-3 max-[900px]:overflow-x-auto max-[900px]:border-b max-[900px]:border-r-0 max-[900px]:py-3">
      <span className="px-2 text-lg"><Logo tamano={26} texto="Admin" /></span>
      <nav className="grid gap-5 max-[900px]:flex max-[900px]:gap-1">
        {secciones.map((s) => (
          <div key={s} className="grid gap-0.5 max-[900px]:flex">
            <span className="px-2 pb-1 font-mono text-[11px] uppercase tracking-wider text-ink-3 max-[900px]:hidden">{s}</span>
            {items.filter((i) => i.seccion === s).map((i) => (
              <Link key={i.href} href={i.href}
                className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-[15px] font-medium no-underline ${activo.startsWith(i.href) ? 'bg-surface text-ink' : 'text-ink-2 hover:text-ink'}`}>
                {i.texto}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto grid gap-2 border-t border-line pt-4 max-[900px]:ml-auto max-[900px]:mt-0 max-[900px]:flex max-[900px]:items-center max-[900px]:border-t-0 max-[900px]:pt-0">
        <div className="px-2 text-sm"><b className="block">{usuario}</b><span className="font-mono text-xs text-ink-3">{rol}</span></div>
        <Button variante="ghost" className="justify-start" onClick={alSalir}>Salir</Button>
      </div>
    </aside>
  );
}
