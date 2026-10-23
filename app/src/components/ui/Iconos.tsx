// Íconos de trazo (heredan el color con currentColor)
type P = { tamano?: number; className?: string; grosor?: number };
const svg = (tamano: number, grosor: number, className: string | undefined, children: React.ReactNode) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{children}</svg>
);

export const IconoHuella = ({ tamano = 22, grosor = 1.8, className }: P) => svg(tamano, grosor, className,
  <path d="M12 11c0 3-1 6-3 8M8 6.5A6 6 0 0 1 18 11c0 2-.3 4-1 6M6 9.5A6 6 0 0 0 6 13c0 1.5-.3 3-1 4.3M12 11c0-1.1.9-2 2-2M10 11a2 2 0 1 1 4 0c0 3.5-1 6.5-2.5 9" />);
export const IconoRostro = ({ tamano = 22, grosor = 1.8, className }: P) => svg(tamano, grosor, className,
  <><circle cx="12" cy="9" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>);
export const IconoFirma = ({ tamano = 22, grosor = 1.8, className }: P) => svg(tamano, grosor, className,
  <><path d="M3 17c3-1 4-8 6-8s0 8 3 8 3-5 5-5 2 3 4 3" /><path d="M3 21h18" /></>);
export const IconoCedula = ({ tamano = 34, grosor = 1.6, className }: P) => svg(tamano, grosor, className,
  <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><circle cx="8" cy="11" r="2.2" /><path d="M5 16c.6-1.4 1.7-2.2 3-2.2s2.4.8 3 2.2M13.5 10h5M13.5 13h5" /></>);
export const IconoCheck = ({ tamano = 22, grosor = 2.4, className }: P) => svg(tamano, grosor, className, <path d="M5 12l5 5 9-10" />);
export const IconoPlay = ({ tamano = 20, grosor = 2.2, className }: P) => svg(tamano, grosor, className, <path d="M5 3l14 9-14 9z" />);
export const IconoPdf = ({ tamano = 36, grosor = 1.6, className }: P) => svg(tamano, grosor, className,
  <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 14l2 2 4-4" /></>);
