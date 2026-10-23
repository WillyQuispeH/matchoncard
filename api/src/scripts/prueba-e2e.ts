// Prueba de punta a punta contra una API en marcha: simula a Portalfirma (cliente) y al teléfono (captura cifrada).
// Uso: API_URL=http://127.0.0.1:4561 (entrada pública: app) CLIENTE_ID=... CLIENTE_SECRETO=... WEBHOOK_SECRETO=... ZIP=ruta.zip yarn test:e2e
import 'dotenv/config';
import { createHash, createHmac, webcrypto } from 'crypto';
import { readFileSync } from 'fs';
import { createServer } from 'http';
import * as jwt from 'jsonwebtoken';

const API = process.env.API_URL || 'http://127.0.0.1:4561';
const ID = process.env.CLIENTE_ID!, SEC = process.env.CLIENTE_SECRETO!, WSEC = process.env.WEBHOOK_SECRETO!;
const ZIP = readFileSync(process.env.ZIP!);
let fallas = 0;
// api-webhook corre en otro contenedor: con Docker usa RECEPTOR_URL=http://host.docker.internal:4555/webhook RECEPTOR_HOST=0.0.0.0
const RECEPTOR = process.env.RECEPTOR_URL || 'http://127.0.0.1:4555/webhook';
const ok = (cond: unknown, msg: string) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallas++; };
const tokenCliente = (vida = 120) => jwt.sign({}, SEC, { algorithm: 'HS256', issuer: ID, expiresIn: vida });
const cli = (metodo: string, ruta: string, cuerpo?: unknown, vida?: number) =>
  fetch(API + ruta, { method: metodo, headers: { id: ID, Authorization: `Bearer ${tokenCliente(vida)}`, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
const tel = (ruta: string, sesion: string | null, cuerpo: unknown) =>
  fetch(API + ruta, { method: 'POST', headers: { ...(sesion ? { Authorization: `Bearer ${sesion}` } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

// el mismo cifrado que hace el navegador (WebCrypto)
async function cifrar(zip: Buffer, claveB64: string) {
  const k = await webcrypto.subtle.importKey('raw', Buffer.from(claveB64, 'base64'), 'AES-GCM', false, ['encrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: Buffer.from('V3P1') }, k, zip));
  return Buffer.concat([Buffer.from('V3P1'), iv, ct]);
}

const recibidos: any[] = [];
const receptor = createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    const firma = String(req.headers['x-v3p-firma'] || '');
    recibidos.push({ cuerpo: JSON.parse(b), firmaOk: firma === 'sha256=' + createHmac('sha256', WSEC).update(b).digest('hex') });
    res.writeHead(204).end();
  });
});

type N = 'ok' | 'warn' | 'bad';
async function flujo(rut: string, runLeido: string[], nivel: N, alterarHash = false, fx: { huella?: N; rostro?: N; firma?: N; omitida?: boolean } = {}) {
  const r = await cli('POST', '/v1/validaciones', { rut, nombre: 'Persona de Prueba', documento_id: 'DOC-1', referencia: 'ref-' + Date.now(), callback_url: RECEPTOR });
  const v: any = await r.json();
  const token = v.url_captura.split('/captura/')[1];
  const pag = await fetch(`${API}/captura/${token}`);
  const ini: any = await (await tel('/v1/captura/iniciar', null, { token })).json();
  const sinConsent = await tel('/v1/captura/subida', ini.sesion, { bytes: 5000 });
  await tel('/v1/captura/consentimiento', ini.sesion, { version: ini.config.consentimiento_version, texto: 'Autorizo el tratamiento de mis datos biométricos para validar mi identidad.', otorgado_en: new Date().toISOString() });
  const archivo = await cifrar(ZIP, ini.clave);
  const sub: any = await (await tel('/v1/captura/subida', ini.sesion, { bytes: archivo.length })).json();
  const put = await fetch(sub.url, { method: 'PUT', headers: sub.cabeceras, body: archivo });
  const sha = createHash('sha256').update(ZIP).digest('hex');
  const res: any = await (await tel('/v1/captura/resultado', ini.sesion, {
    resultado: { global: nivel === 'ok' ? 'Identidad validada' : 'No validada', nivel, huella: { probabilidad: fx.omitida ? null : 0.9996, nivel: fx.huella ?? nivel, ...(fx.omitida ? { omitida: true } : {}) }, rostro: { probabilidad: 0.93, prueba_de_vida: true, nivel: fx.rostro ?? nivel }, firma: { parecido: 54, nivel: fx.firma ?? nivel }, run_leido: runLeido, motores: { huella: 'FPEngine 1.6.0', firma: 'SigEngine 1.0.0' } },
    evidencia_sha256: alterarHash ? 'f'.repeat(64) : sha, bytes_cifrados: archivo.length })).json();
  return { r, v, token, pag, ini, sinConsent, sub, put, res, archivo };
}

async function main() {
  await new Promise<void>((ok) => receptor.listen(4555, process.env.RECEPTOR_HOST || '127.0.0.1', ok));
  ok((await fetch(API + '/health')).status === 200, 'health responde');
  ok((await fetch(API + '/v1/validaciones/x', { headers: { id: ID } })).status === 401, 'sin JWT → 401');
  ok((await cli('POST', '/v1/validaciones', { rut: '11.111.111-1' }, 3600)).status === 401, 'JWT de 1 hora → 401 (máx. 5 min)');
  ok((await cli('POST', '/v1/validaciones', { rut: '11.111.111-2' })).status === 400, 'RUT con DV inválido → 400');

  const a = await flujo('11.111.111-1', ['11111111-1'], 'ok');
  ok(a.r.status === 201 && a.v.url_captura.includes('/captura/'), 'crear validación → link de captura');
  ok(a.pag.status === 200 && (a.pag.headers.get('content-type') || '').includes('html'), 'página de captura servida');
  ok(!!a.ini.sesion && Buffer.from(a.ini.clave, 'base64').length === 32, 'iniciar → sesión + clave AES-256');
  ok(a.sinConsent.status === 409, 'subir sin consentimiento → 409');
  ok(a.put.status === 200, 'PUT directo al bucket con URL firmada');
  ok(a.res.estado === 'aprobada', `resultado → aprobada (${a.res.estado})`);
  const g: any = await (await cli('GET', `/v1/validaciones/${a.v.validacion_id}`)).json();
  ok(g.integridad === 'ok' && g.puntajes.huella === 0.9996 && g.rut === '****111-1', 'consulta: integridad ok, puntajes y RUT enmascarado');
  ok((await tel('/v1/captura/iniciar', null, { token: a.token })).status === 410, 'link ya usado tras finalizar → 410');
  ok((await cli('GET', `/v1/validaciones/${a.v.validacion_id}/evidencia`)).status === 400, 'descargar evidencia sin motivo → 400');
  const ev = await cli('GET', `/v1/validaciones/${a.v.validacion_id}/evidencia?motivo=${encodeURIComponent('Peritaje caso 123')}`);
  ok(ev.status === 200 && Buffer.from(await ev.arrayBuffer()).equals(ZIP), 'evidencia descifrada = ZIP original byte a byte');
  const enBucket = await fetch(a.sub.url.split('?')[0]);
  ok(enBucket.status !== 200 || !Buffer.from(await enBucket.arrayBuffer()).includes(Buffer.from('datos.json')), 'el bucket no expone el contenido en claro');

  const b = await flujo('22.222.222-2', ['12.345.678-5'], 'ok');
  ok(b.res.estado === 'rechazada', `RUN de la cédula distinto al esperado → rechazada (${b.res.estado})`);
  const c = await flujo('22.222.222-2', ['22222222-2'], 'ok', true);
  ok(c.res.estado === 'revision', `hash declarado no coincide → revisión (${c.res.estado})`);

  // regla 2 de 3: huella, rostro y firma
  const d1 = await flujo('11.111.111-1', ['11111111-1'], 'ok', false, { huella: 'bad' });
  ok(d1.res.estado === 'revision', `2 de 3 (huella no coincide) → revisión (${d1.res.estado})`);
  const d2 = await flujo('11.111.111-1', ['11111111-1'], 'warn', false, { huella: 'warn', omitida: true, rostro: 'ok', firma: 'ok' });
  ok(d2.res.estado === 'revision', `huella omitida + rostro y firma ok → revisión (${d2.res.estado})`);
  const g2: any = await (await cli('GET', `/v1/validaciones/${d2.v.validacion_id}`)).json();
  ok(g2.motivos.includes('huella_omitida') && g2.motivos.includes('huella_no_confirmada'), 'motivos registran la huella omitida');
  const d3 = await flujo('11.111.111-1', ['11111111-1'], 'ok', false, { huella: 'warn', omitida: true, firma: 'bad' });
  ok(d3.res.estado === 'rechazada', `1 de 3 (sin huella y firma no coincide) → rechazada (${d3.res.estado})`);
  const d4 = await flujo('11.111.111-1', ['11111111-1'], 'warn');
  ok(d4.res.estado === 'rechazada', `0 de 3 confirmados → rechazada (${d4.res.estado})`);

  const t: any = await (await cli('GET', '/v1/titulares/22.222.222-2/validaciones')).json();
  ok(t.validaciones.length >= 2, `derecho de acceso: validaciones del RUT 22.222.222-2 (${t.validaciones.length})`);
  const del = await cli('DELETE', `/v1/validaciones/${a.v.validacion_id}`, { motivo: 'Solicitud de supresión del titular' });
  ok(del.status === 200, 'supresión → 200');
  ok((await cli('GET', `/v1/validaciones/${a.v.validacion_id}/evidencia?motivo=verificar%20borrado`)).status === 410, 'evidencia tras supresión → 410');

  await new Promise((r) => setTimeout(r, 1500));
  ok(recibidos.length >= 3 && recibidos.every((w) => w.firmaOk), `webhooks recibidos con firma HMAC válida (${recibidos.length})`);
  ok(recibidos.some((w) => w.cuerpo.estado === 'aprobada' && w.cuerpo.evidencia_sha256), 'webhook incluye estado y hash de la evidencia');
  receptor.close();
  console.log(fallas ? `\n${fallas} pruebas fallaron` : '\nTodas las pruebas pasaron');
  process.exit(fallas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
