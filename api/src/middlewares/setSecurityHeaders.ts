import helmet from 'helmet';

// La API solo responde JSON y archivos: la CSP de las páginas la pone el servicio "app" (nginx).
export const setSecurityHeaders = () =>
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, hsts: { maxAge: 31536000, includeSubDomains: true } });
