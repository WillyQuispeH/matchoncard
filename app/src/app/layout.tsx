import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import '@/styles/globals.css';

// Fuentes descargadas al compilar y servidas desde el mismo origen (la CSP no permite fuentes externas).
// IBM Plex, la misma del panel de administración: sobria y fácil de leer
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-plex-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'MatchOnCard · Validación de identidad con la cédula',
  description: 'MatchOnCard compara la huella, el rostro y la firma de una persona con su cédula de identidad chilena, en el momento y desde el teléfono, sin lectores ni apps.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#222324' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
