import type { NextConfig } from 'next';

// Cabeceras de seguridad por página (antes las ponía nginx).
// La captura (/captura/<token> y /demo) pone las suyas en su Route Handler. El panel está en app-admin.
const BASE = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
];
const REFERRER = { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' };

// Next necesita 'unsafe-inline' para hidratar; en desarrollo además 'unsafe-eval'.
const dev = process.env.NODE_ENV !== 'production';
const csp = (formAction: string) =>
  `default-src 'self'; script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; font-src 'self'; ` +
  `img-src 'self' data: blob:; connect-src 'self'${dev ? ' ws: wss:' : ''}; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action ${formAction}`;

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // yarn dev:red: abrir desde el celular por la IP de la red local (Next bloquea otros orígenes en desarrollo)
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
  async headers() {
    return [
      { source: '/', headers: [...BASE, REFERRER] },
      { source: '/integracion', headers: [...BASE, REFERRER, { key: 'X-Frame-Options', value: 'DENY' }] },
      {
        source: '/verificar',
        headers: [...BASE, REFERRER,
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp("'none'") }],
      },
    ];
  },
};

export default nextConfig;
