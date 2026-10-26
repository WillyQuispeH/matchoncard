import { create } from 'zustand';

// Lenguaje elegido en los ejemplos de la documentación: al cambiarlo en un bloque, cambian todos.
interface LenguajeState {
  lenguaje: string;
  lenguajeElegir: (l: string) => void;
}

export const useLenguajeStore = create<LenguajeState>((set) => ({
  lenguaje: 'cURL',
  lenguajeElegir: (lenguaje) => {
    set({ lenguaje });
    try { localStorage.setItem('moc-lenguaje', lenguaje); } catch { /* sin almacenamiento */ }
  },
}));
