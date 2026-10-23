'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { InputSelect } from '@/components/ui/InputSelect';
import { InputText } from '@/components/ui/InputText';
import { FILTROS_ESTADO } from '@/utils/textos';

interface Props { rut: string; estado: string; alBuscar: (f: { rut: string; estado: string }) => void }

export function FiltrosValidaciones({ rut, estado, alBuscar }: Props) {
  const [texto, setTexto] = useState(rut);
  useEffect(() => setTexto(rut), [rut]);
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <InputText placeholder="Buscar por RUT" aria-label="Buscar por RUT" className="max-w-[240px]" value={texto}
        onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') alBuscar({ rut: texto.trim(), estado }); }} />
      <InputSelect aria-label="Filtrar por estado" className="max-w-[200px]" opciones={FILTROS_ESTADO} value={estado}
        onChange={(e) => alBuscar({ rut: texto.trim(), estado: e.target.value })} />
      <Button onClick={() => alBuscar({ rut: texto.trim(), estado })}>Buscar</Button>
      <Button variante="ghost" onClick={() => { setTexto(''); alBuscar({ rut: '', estado: '' }); }}>Limpiar</Button>
    </div>
  );
}
