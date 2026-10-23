import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

const MENU: [string, string][] = [
  ['#como', 'Cómo funciona'], ['#tecnologia', 'Tecnología'], ['#seguridad', 'Seguridad'], ['#api', 'Integración'], ['/verificar', 'Verificar documento'],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-bg/80 backdrop-blur-md">
      <nav aria-label="Principal" className="mx-auto flex h-[68px] max-w-[1120px] items-center gap-7 px-6 max-[560px]:px-4">
        <Link href="/" className="text-[21px] text-ink no-underline"><Logo tamano={30} /></Link>
        <ul className="ml-auto flex list-none gap-6 p-0 max-[980px]:hidden">
          {MENU.map(([h, t]) => <li key={h}><a href={h} className="text-[15px] text-ink-2 no-underline hover:text-ink">{t}</a></li>)}
        </ul>
        <ButtonLink href="/demo" variante="primary" className="max-[980px]:ml-auto">Probar DEMO</ButtonLink>
      </nav>
    </header>
  );
}
