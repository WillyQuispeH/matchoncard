import type { SelectHTMLAttributes } from 'react';
import { claseCampo } from './InputText';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> { opciones: [string, string][] }

export function InputSelect({ opciones, className = '', ...p }: Props) {
  return (
    <select className={`${claseCampo} ${className}`} {...p}>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  );
}
