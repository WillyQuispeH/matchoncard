import dotenv from 'dotenv';

// .env del servicio (en Docker las variables llegan por env_file y dotenv no las pisa)
dotenv.config();

// Configuración leída de variables de entorno. Falla al arrancar si falta algo crítico.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}
const num = (name: string, def: number) => (process.env[name] ? Number(process.env[name]) : def);

export const config = {
  puerto: num('PORT', 4560),
  // URL pública con la que el firmante abre la captura, ej. https://api.matchoncard.cl (sin definir: la app local)
  urlPublica: (process.env.PUBLIC_URL || 'http://127.0.0.1:4561').replace(/\/$/, ''),

  // Clave maestra (KEK) 32 bytes en base64. Envuelve las claves de cada validación y los secretos de clientes.
  kek: { id: process.env.KEK_ID || 'k1', clave: req('KEK_BASE64') },
  // KEK anteriores durante una rotación: "k0:base64,k-1:base64"
  kekAnteriores: (process.env.KEK_PREVIOUS || '').split(',').filter(Boolean).map((s) => { const [id, clave] = s.split(':'); return { id, clave }; }),
  // secreto para firmar los tokens de sesión del teléfono (≥ 32 bytes aleatorios)
  secretoSesion: req('SESSION_SECRET'),
  // "pimienta" para el hash del RUT (permite buscar por RUT sin guardarlo en claro)
  pimientaRut: req('RUT_PEPPER'),

  // Cloudflare R2 (API compatible con S3). Evidencia y PDF van cifrados; el bucket debe ser privado.
  r2: {
    endpoint: req('R2_ENDPOINT'), // https://<account_id>.r2.cloudflarestorage.com
    bucket: req('R2_BUCKET'),
    accessKeyId: req('R2_ACCESS_KEY_ID'),
    secretAccessKey: req('R2_SECRET_ACCESS_KEY'),
  },

  captura: {
    linkMinutos: num('CAPTURE_LINK_MINUTES', 60 * 24), // vigencia del link enviado al firmante
    sesionMinutos: num('CAPTURE_SESSION_MINUTES', 40), // tiempo para completar una vez abierto
    subidaSegundos: num('UPLOAD_URL_SECONDS', 600),
    maxBytes: num('MAX_EVIDENCE_BYTES', 50 * 1024 * 1024),
    origenesCors: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  },

  retencion: {
    diasAprobada: num('RETENTION_DAYS_APPROVED', 365 * 5),
    diasOtras: num('RETENTION_DAYS_OTHER', 30),
  },

  responsable: {
    nombre: process.env.CONTROLLER_NAME || 'Portalfirma',
    contacto: process.env.CONTROLLER_CONTACT || 'privacidad@portalfirma.cl',
    versionConsentimiento: process.env.CONSENT_VERSION || '2026-10-api',
  },

  jwtMaxSegundos: num('CLIENT_JWT_MAX_SECONDS', 300),

  // cola de webhooks: la API firma y reintenta; api-webhook (servicioUrl) solo hace la llamada al cliente
  webhooks: {
    maxIntentos: num('WEBHOOK_MAX_INTENTOS', 8),
    lote: num('WEBHOOK_LOTE', 20),
    servicioUrl: (process.env.WEBHOOK_SERVICE_URL || 'http://api-webhook:4562').replace(/\/$/, ''),
  },

  // solo desarrollo: app-admin entra como superadmin sin login. Con NODE_ENV=production no tiene efecto.
  adminSinLogin: process.env.ADMIN_SIN_LOGIN === 'true' && process.env.NODE_ENV !== 'production',
};
export type Config = typeof config;
