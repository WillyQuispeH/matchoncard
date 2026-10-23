import { forwardRef, type InputHTMLAttributes } from 'react';

export const claseCampo = 'min-h-[42px] w-full rounded-[10px] border border-line-2 bg-sunken px-3 text-ink placeholder:text-ink-3';

interface Props extends InputHTMLAttributes<HTMLInputElement> { etiqueta?: string }

export const InputText = forwardRef<HTMLInputElement, Props>(function InputText({ etiqueta, className = '', ...p }, ref) {
  const campo = <input ref={ref} className={`${claseCampo} ${className}`} {...p} />;
  if (!etiqueta) return campo;
  return (
    <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">
      {etiqueta}
      {campo}
    </label>
  );
});
