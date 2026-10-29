import type { Metadata, Viewport } from 'next';
import { Gasoek_One, Geist, Geist_Mono } from 'next/font/google';
import '@/styles/globals.css';

// Fuentes descargadas al compilar y servidas desde el mismo origen (la CSP no permite fuentes externas).
const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const display = Gasoek_One({ subsets: ['latin'], weight: '400', variable: '--font-gasoek', display: 'swap' });   // titulares grandes

export const metadata: Metadata = {
  title: 'MatchOnCard · Validación de identidad con la cédula',
  description: 'MatchOnCard compara la huella, el rostro y la firma de una persona con su cédula de identidad chilena, en el momento y desde el teléfono, sin lectores ni apps.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#222324' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
