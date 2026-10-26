// Genera las colecciones de Postman de la API.
//   yarn postman       → public/matchoncard.postman_collection.json (la que se descarga desde /integracion)
//   yarn postman:dev   → ../postman/matchoncard-dev.postman_collection.json (solo local: API en localhost:4560,
//                        tus credenciales y utilidades de desarrollo). La carpeta postman/ no va a git.
// Las credenciales de dev se leen de ../postman/dev.json (opcional):
//   { "cliente_id": "pruebas", "secreto_jwt": "...", "secreto_webhook": "...", "callback_url": "https://…ngrok-free.app", "rut": "…" }
const fs = require('fs');
const path = require('path');

const DEV = process.argv[2] === 'dev';
const CARPETA_DEV = path.resolve(__dirname, '../../postman');
const SALIDA = DEV ? path.join(CARPETA_DEV, 'matchoncard-dev.postman_collection.json') : path.resolve(__dirname, '../public/matchoncard.postman_collection.json');
const PENDIENTE = 'PEGA_AQUI_TU_SECRETO';

let dev = {};
if (DEV) {
  fs.mkdirSync(CARPETA_DEV, { recursive: true });
  const archivo = path.join(CARPETA_DEV, 'dev.json');
  if (fs.existsSync(archivo)) dev = JSON.parse(fs.readFileSync(archivo, 'utf8'));
}

// ───────── scripts de Postman ─────────

// Firma un JWT HS256 nuevo por solicitud (iss = cliente_id, vida 120 s) y lo deja en {{jwt}}
const preRequest = `// Firma un JWT HS256 nuevo por solicitud (iss = cliente_id, vida 120 s) y lo deja en {{jwt}} (variable local de la solicitud: no aparece en la pestaña Variables).
// Las solicitudes /v1 lo envían en sus cabeceras: id: {{cliente_id}} y Authorization: Bearer {{jwt}}
if (!pm.request.url.getPath().startsWith('/v1')) return;
const id = pm.collectionVariables.get('cliente_id');
const secreto = pm.collectionVariables.get('secreto_jwt');
if (!id || !secreto || secreto === '${PENDIENTE}')
  throw new Error('Falta tu credencial: abre la colección → pestaña Variables → completa cliente_id y secreto_jwt (columna Current value) y guarda con Ctrl+S');
const b64url = (w) => CryptoJS.enc.Base64.stringify(w).replace(/=+$/, '').replace(/\\+/g, '-').replace(/\\//g, '_');
const ahora = Math.floor(Date.now() / 1000);
const cabeza = b64url(CryptoJS.enc.Utf8.parse(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
const cuerpo = b64url(CryptoJS.enc.Utf8.parse(JSON.stringify({ iss: id, iat: ahora, exp: ahora + 120 })));
const firma = b64url(CryptoJS.HmacSHA256(cabeza + '.' + cuerpo, secreto));
pm.variables.set('jwt', cabeza + '.' + cuerpo + '.' + firma);`;

// Firma el cuerpo como lo hace MatchOnCard al enviar un webhook (para probar tu receptor)
const firmarWebhook = `const secreto = pm.collectionVariables.get('secreto_webhook');
if (!secreto || secreto === '${PENDIENTE}') throw new Error('Completa secreto_webhook en las variables de la colección');
const cuerpo = pm.variables.replaceIn(pm.request.body.raw);   // firma lo que realmente se envía (variables ya reemplazadas)
pm.variables.set('firma_webhook', 'sha256=' + CryptoJS.HmacSHA256(cuerpo, secreto).toString(CryptoJS.enc.Hex));
pm.variables.set('entrega', 'prueba-' + Date.now());`;

const guardar = (pares, extra = []) => [{
  listen: 'test',
  script: { type: 'text/javascript', exec: [
    'if (pm.response.code < 300) {',
    '  const r = pm.response.json();',
    ...pares.map(([v, expr]) => `  if (${expr}) pm.collectionVariables.set('${v}', ${expr});`),
    ...extra,
    '}',
  ] },
}];

// ───────── piezas ─────────

const url = (ruta, query, base = '{{base_url}}') => {
  const partes = ruta.split('?')[0].split('/').filter(Boolean);
  const u = { raw: `${base}/${ruta}`, host: [base], path: partes };
  if (query) u.query = query;
  return u;
};
const json = (obj) => ({ mode: 'raw', raw: JSON.stringify(obj, null, 2), options: { raw: { language: 'json' } } });

// cabeceras de identificación del cliente (el JWT lo firma el script previo de la colección)
const AUTH = [
  { key: 'id', value: '{{cliente_id}}', description: 'Id de tu cliente' },
  { key: 'Authorization', value: 'Bearer {{jwt}}', description: 'No lo edites: el script previo pone aquí un JWT nuevo en cada envío' },
];

const req = (name, method, ruta, { body, desc, query, eventos, headers = [], base } = {}) => ({
  name,
  ...(eventos ? { event: eventos } : {}),
  request: {
    method,
    header: [
      ...(ruta.startsWith('v1/') ? AUTH : []),
      ...(body && body.mode === 'raw' ? [{ key: 'Content-Type', value: 'application/json' }] : []),
      ...headers,
    ],
    ...(body ? { body } : {}),
    url: url(ruta, query, base),
    description: desc,
  },
});

// PDF A4 en blanco, válido (offsets de xref correctos)
const PDF_MIN = 'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvUmVzb3VyY2VzIDw8ID4+ID4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNCAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKMjAzCiUlRU9GCg==';

// ───────── colección ─────────

const variables = [
  { key: 'base_url', value: DEV ? 'http://localhost:4560' : 'https://api.matchoncard.cl' },
  { key: 'cliente_id', value: dev.cliente_id || (DEV ? 'pruebas' : 'mi-empresa'), description: 'El id de tu cliente de la API' },
  { key: 'secreto_jwt', value: dev.secreto_jwt || PENDIENTE, description: 'El secreto_jwt que entrega yarn cliente:crear (o el panel de administración) al crear tu cliente' },
  { key: 'callback_url', value: dev.callback_url || 'https://tu-empresa.cl/webhooks/matchoncard', description: 'Dónde recibes los webhooks' },
  ...(DEV ? [{ key: 'secreto_webhook', value: dev.secreto_webhook || PENDIENTE, description: 'Para firmar los webhooks simulados' }] : []),
  { key: 'rut', value: dev.rut || '12.345.678-5' },
  { key: 'validacion_id', value: '' },
  { key: 'documento_id', value: '' },
  { key: 'firmante_id', value: '' },
];

const carpetas = [
  {
    name: 'Validaciones',
    item: [
      req('Crear validación', 'POST', 'v1/validaciones', {
        desc: 'Crea la validación y devuelve `url_captura`, el link para el firmante (vale 24 h). Rol: integracion.',
        body: json({ rut: '{{rut}}', nombre: 'Ana Pérez', referencia: 'OP-2026-0042', callback_url: '{{callback_url}}' }),
        eventos: guardar([['validacion_id', 'r.validacion_id']], DEV ? ["  console.log('url_captura:', r.url_captura);"] : []),
      }),
      req('Consultar validación', 'GET', 'v1/validaciones/{{validacion_id}}', { desc: 'Estado, motivos, puntajes y hash de la evidencia. Roles: integracion, auditor, dpo.' }),
      req('Descargar evidencia (ZIP)', 'GET', 'v1/validaciones/{{validacion_id}}/evidencia?motivo=Peritaje%20solicitado%20por%20legal', {
        desc: 'ZIP descifrado con las capturas. Cada descarga queda auditada con su motivo. Rol: auditor. Usa "Send and Download".',
        query: [{ key: 'motivo', value: 'Peritaje%20solicitado%20por%20legal' }],
      }),
      req('Suprimir validación', 'DELETE', 'v1/validaciones/{{validacion_id}}', {
        desc: 'Borra la evidencia y destruye su clave (irreversible). Rol: dpo.',
        body: json({ motivo: 'Solicitud de supresión del titular' }),
      }),
      req('Validaciones de un RUT', 'GET', 'v1/titulares/{{rut}}/validaciones', { desc: 'Derecho de acceso: validaciones asociadas a un RUT. Rol: dpo.' }),
    ],
  },
  {
    name: 'Documentos',
    item: [
      req('Registrar documento', 'POST', 'v1/documentos', {
        desc: 'Sella el PDF y devuelve un link por firmante habilitado. `pdf` va en base64 (máx. 25 MB); este ejemplo trae un PDF A4 en blanco. Coordenadas en puntos desde la esquina superior izquierda. Rol: integracion.',
        body: json({
          nombre: 'Contrato de prueba', referencia: 'OP-2026-0042', orden: 'secuencial', callback_url: '{{callback_url}}', pdf: PDF_MIN,
          firmantes: [
            { rut: '{{rut}}', nombre: 'Ana Pérez', ubicaciones: [{ pagina: 1, x: 60, y: 700 }] },
            { rut: '9.876.543-3', nombre: 'Luis Soto', ubicaciones: [{ pagina: 1, x: 330, y: 700 }] },
          ],
        }),
        eventos: guardar([['documento_id', 'r.documento_id'], ['firmante_id', 'r.firmantes && r.firmantes[0] && r.firmantes[0].firmante_id']]),
      }),
      req('Listar documentos', 'GET', 'v1/documentos', { desc: 'Últimos 100 documentos. Roles: integracion, auditor.' }),
      req('Consultar documento', 'GET', 'v1/documentos/{{documento_id}}', { desc: 'Estado del documento y de cada firmante. Roles: integracion, auditor, dpo.' }),
      req('Descargar PDF', 'GET', 'v1/documentos/{{documento_id}}/pdf', { desc: 'Versión vigente. Cabeceras X-Documento-Version y X-Documento-Sha256. Usa "Send and Download".' }),
      req('Nuevo link de firmante', 'POST', 'v1/documentos/{{documento_id}}/firmantes/{{firmante_id}}/enlace', { desc: 'Emite un link nuevo; el anterior deja de servir. Rol: integracion.' }),
      req('Cancelar documento', 'POST', 'v1/documentos/{{documento_id}}/cancelar', {
        desc: 'Cancela un documento pendiente. Rol: integracion.',
        body: json({ motivo: 'El cliente desistió de la operación' }),
      }),
      req('Suprimir documento', 'DELETE', 'v1/documentos/{{documento_id}}', {
        desc: 'Borra todas las versiones y destruye la clave (irreversible). Rol: dpo.',
        body: json({ motivo: 'Fin del plazo de conservación' }),
      }),
    ],
  },
  {
    name: 'Público',
    item: [
      req('Verificar PDF firmado', 'POST', 'verificar/api', {
        desc: 'Sin credenciales. En Body → binary elige el PDF firmado. Límite 12 por minuto.',
        body: { mode: 'file', file: { src: '' } },
        headers: [{ key: 'Content-Type', value: 'application/pdf' }],
      }),
      req('Estado del servicio', 'GET', 'health', { desc: 'Sin credenciales. { ok, db, version }.' }),
    ],
  },
];

// utilidades solo para desarrollo
if (DEV) carpetas.push({
  name: 'Desarrollo',
  item: [
    req('Simular webhook a mi callback', 'POST', '', {
      base: '{{callback_url}}',
      desc: 'Envía a tu callback_url un webhook firmado igual que MatchOnCard (X-V3P-Firma con secreto_webhook), para probar tu receptor sin hacer una validación completa.',
      body: json({
        evento: 'validacion.finalizada', validacion_id: '{{validacion_id}}', referencia: 'OP-2026-0042', documento_id: null,
        estado: 'aprobada', motivos: [], veredicto_dispositivo: 'Identidad confirmada',
        puntajes: { huella: 0.99, rostro: 0.93, prueba_de_vida: true, firma: 54 },
        evidencia_sha256: '0'.repeat(64), integridad: 'ok', verificacion_servidor: null, fecha: new Date().toISOString(),
      }),
      headers: [
        { key: 'X-V3P-Evento', value: 'validacion.finalizada' },
        { key: 'X-V3P-Entrega', value: '{{entrega}}' },
        { key: 'X-V3P-Firma', value: '{{firma_webhook}}' },
      ],
      eventos: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: firmarWebhook.split('\n') } }],
    }),
    req('App local: entrada pública (proxy a la API)', 'GET', 'health', { base: 'http://localhost:4561', desc: 'La misma API a través de la app (Next.js), como la ve el teléfono.' }),
  ],
});

const coleccion = {
  info: {
    name: DEV ? 'MatchOnCard API v1 · DEV (local)' : 'MatchOnCard API v1',
    description: (DEV
      ? 'Colección de DESARROLLO: apunta a la API local (http://localhost:4560) y trae tus credenciales. No la compartas.\n\n'
      : 'Colección de la API de MatchOnCard (validación de identidad y firma de documentos).\n\n' +
        '1. Abre la colección → Variables y completa `cliente_id` y `secreto_jwt` (columna Current value). Guarda con Ctrl+S.\n' +
        '2. Para probar en local cambia `base_url` a `http://localhost:4560`.\n' +
        '3. Ejecuta **Crear validación**: `validacion_id` se guarda solo.\n\n') +
      'Cada solicitud a /v1 lleva las cabeceras `id: {{cliente_id}}` y `Authorization: Bearer {{jwt}}`. ' +
      'El script previo de la colección firma un JWT HS256 nuevo en `{{jwt}}` antes de cada envío.\n\n' +
      'Documentación: https://matchoncard.cl/integracion',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: preRequest.split('\n') } }],
  variable: variables,
  item: carpetas,
};

fs.writeFileSync(SALIDA, JSON.stringify(coleccion, null, 2) + '\n');
console.log(`Colección ${DEV ? 'de desarrollo' : 'pública'}: ${SALIDA}`);
if (DEV && (!dev.secreto_jwt || !dev.secreto_webhook)) console.log(`Faltan credenciales: complétalas en ${path.join(CARPETA_DEV, 'dev.json')} y vuelve a correr yarn postman:dev`);
