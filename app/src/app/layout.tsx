import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google';
import '@/styles/globals.css';

// Fuentes descargadas al compilar y servidas desde el mismo origen (la CSP no permite fuentes externas).
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-sans', display: 'swap' });
const cond = IBM_Plex_Sans_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-plex-cond', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });

const ICONO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230B1116'/%3E%3Crect x='6' y='9' width='20' height='14' rx='3' fill='none' stroke='%235DB1D1' stroke-width='2'/%3E%3Cpath d='M11 18l3 3 7-7' fill='none' stroke='%233FD49A' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: 'MatchOnCard · Validación de identidad con la cédula',
  description: 'MatchOnCard compara la huella, el rostro y la firma de una persona con su cédula de identidad chilena, en el momento y desde el teléfono, sin lectores ni apps.',
  icons: { icon: ICONO },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0B1116' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${cond.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
