import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variante = 'default' | 'primary' | 'danger' | 'ghost';
type Tamano = 'sm' | 'md' | 'lg';

const BASE = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border font-semibold no-underline transition disabled:opacity-50';
const VARIANTES: Record<Variante, string> = {
  default: 'border-line-2 bg-surface text-ink hover:border-ink-3',
  primary: 'border-accent bg-accent text-accent-ink hover:bg-accent-hover',
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

// enlace con aspecto de botón. Siempre <a>: /demo y /captura no son páginas de React (los sirve un Route Handler).
export function ButtonLink({ variante, tamano, className = '', href, ...p }: LinkProps) {
  return <a href={href} className={claseBoton(variante, tamano, className)} {...p} />;
}
