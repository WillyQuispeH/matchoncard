import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed } from 'next/font/google';
import { AdminShell } from '@/components/functional/Shell/AdminShell';
import '@/styles/globals.css';

// Fuentes descargadas al compilar y servidas desde el mismo origen (la CSP no permite fuentes externas).
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-sans', display: 'swap' });
const cond = IBM_Plex_Sans_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-plex-cond', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'MatchOnCard Admin',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B1116' };

// Todas las páginas pasan por AdminShell: sin sesión se muestra el ingreso.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${sans.variable} ${cond.variable} ${mono.variable}`}>
      <body><AdminShell>{children}</AdminShell></body>
    </html>
  );
}
