import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variante = 'default' | 'primary' | 'durazno' | 'danger' | 'ghost';
type Tamano = 'sm' | 'md' | 'lg';

// botones con canto inferior sólido (estilo creem.io)
const BASE = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold no-underline transition disabled:opacity-50';
const VARIANTES: Record<Variante, string> = {
  default: 'border-line-2 bg-surface text-ink shadow-[0_2px_0_var(--color-line-2)] hover:border-ink-3',
  primary: 'border-lila-borde bg-accent text-accent-ink shadow-[0_2px_0_var(--color-lila-borde)] hover:bg-accent-hover',
  durazno: 'border-durazno-borde bg-durazno text-accent-ink shadow-[0_2px_0_var(--color-durazno-borde)] hover:brightness-105',
  danger: 'border-bad/50 bg-transparent text-bad hover:border-bad',
  ghost: 'border-transparent bg-transparent text-ink-2 hover:text-ink',
};
const TAMANOS: Record<Tamano, string> = {
  sm: 'min-h-[34px] px-3 text-[13px]',
  md: 'min-h-10 px-4 text-[15px]',
  lg: 'min-h-[52px] rounded-[14px] px-6 text-base hover:-translate-y-px',
};

export const claseBoton = (variante: Variante = 'default', tamano: Tamano = 'md', extra = '') =>
  `${BASE} ${VARIANTES[variante]} ${TAMANOS[tamano]} ${extra}`;

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variante?: Variante; tamano?: Tamano }

export function Button({ variante, tamano, className = '', type = 'button', ...p }: Props) {
  return <button type={type} className={claseBoton(variante, tamano, className)} {...p} />;
}

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> { href: string; variante?: Variante; tamano?: Tamano }

// Rutas internas que NO son páginas de React (las sirve un Route Handler): se abren con <a> y recarga completa
const RUTAS_SERVIDOR = /^\/(demo|captura)(\/|\?|$)/;

// true si el enlace va a una página de React del sitio y puede navegar sin recargar
export const esPaginaInterna = (href: string) =>
  href.startsWith('/') && !href.startsWith('//') && !RUTAS_SERVIDOR.test(href) && !/\.[a-z0-9]+$/i.test(href.split(/[?#]/)[0]);

// enlace con aspecto de botón: <Link> para las páginas del sitio; <a> para /demo, /captura, descargas, anclas y externos
export function ButtonLink({ variante, tamano, className = '', href, ...p }: LinkProps) {
  const clase = claseBoton(variante, tamano, className);
  if (esPaginaInterna(href) && !p.download) return <Link href={href} className={clase} {...p} />;
  return <a href={href} className={clase} {...p} />;
}
