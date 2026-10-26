import type { Metadata, Viewport } from 'next';
import { Gasoek_One, Geist, Geist_Mono } from 'next/font/google';
import '@/styles/globals.css';

// Fuentes descargadas al compilar y servidas desde el mismo origen (la CSP no permite fuentes externas).
const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const display = Gasoek_One({ subsets: ['latin'], weight: '400', variable: '--font-gasoek', display: 'swap' });   // titulares grandes

const ICONO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23222324'/%3E%3Crect x='6' y='9' width='20' height='14' rx='3' fill='none' stroke='%23D1C3FE' stroke-width='2'/%3E%3Cpath d='M11 18l3 3 7-7' fill='none' stroke='%23A1E0A9' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: 'MatchOnCard · Validación de identidad con la cédula',
  description: 'MatchOnCard compara la huella, el rostro y la firma de una persona con su cédula de identidad chilena, en el momento y desde el teléfono, sin lectores ni apps.',
  icons: { icon: ICONO },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#222324' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
