import type { NextConfig } from 'next';

// app-admin (admin.matchoncard.cl): todas las páginas con la misma política estricta.
// Next necesita 'unsafe-inline' para hidratar; en desarrollo además 'unsafe-eval'.
const dev = process.env.NODE_ENV !== 'production';
const CSP =
  `default-src 'self'; script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; font-src 'self'; ` +
  `img-src 'self' data: blob:; connect-src 'self'${dev ? ' ws:' : ''}; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`;

const SEGURIDAD = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      // páginas: sin caché (muestran datos personales) y con CSP
      { source: '/((?!_next/static|pdfjs|admin/api).*)', headers: [...SEGURIDAD, { key: 'Cache-Control', value: 'no-store' }, { key: 'Content-Security-Policy', value: CSP }] },
      { source: '/pdfjs/:archivo*', headers: [...SEGURIDAD, { key: 'Cache-Control', value: 'public, max-age=604800, immutable' }] },
    ];
  },
};

export default nextConfig;
