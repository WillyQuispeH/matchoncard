// Prueba de punta a punta de la firma de documentos contra una API en marcha (con api-signature levantado).
// Uso: API_URL=... CLIENTE_ID=... CLIENTE_SECRETO=... WEBHOOK_SECRETO=... ZIP=evidencia.zip PDF=documento.pdf yarn test:documentos
import 'dotenv/config';
import { createHash, createHmac, webcrypto } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import * as jwt from 'jsonwebtoken';

const API = process.env.API_URL || 'http://127.0.0.1:4561';
const ID = process.env.CLIENTE_ID!, SEC = process.env.CLIENTE_SECRETO!, WSEC = process.env.WEBHOOK_SECRETO!;
const ZIP = readFileSync(process.env.ZIP!), PDF = readFileSync(process.env.PDF!);
const SALIDA = process.env.SALIDA || '/tmp';
let fallas = 0;
// api-webhook corre en otro contenedor: con Docker usa RECEPTOR_URL=http://host.docker.internal:4556/hook RECEPTOR_HOST=0.0.0.0
const RECEPTOR = process.env.RECEPTOR_URL || 'http://127.0.0.1:4556/hook';
const ok = (cond: unknown, msg: string) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) fallas++; };
const cli = (metodo: string, ruta: string, cuerpo?: unknown) =>
  fetch(API + ruta, { method: metodo, headers: { id: ID, Authorization: `Bearer ${jwt.sign({}, SEC, { algorithm: 'HS256', issuer: ID, expiresIn: 120 })}`, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
const tel = (ruta: string, sesion: string | null, cuerpo: unknown) =>
  fetch(API + ruta, { method: 'POST', headers: { ...(sesion ? { Authorization: `Bearer ${sesion}` } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cifrar(zip: Buffer, claveB64: string) {
  const k = await webcrypto.subtle.importKey('raw', Buffer.from(claveB64, 'base64'), 'AES-GCM', false, ['encrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: Buffer.from('V3P1') }, k, zip));
  return Buffer.concat([Buffer.from('V3P1'), iv, ct]);
}

// el teléfono del firmante completa la validación desde su link
async function telefono(url: string, runLeido: string, nivel: 'ok' | 'warn' | 'bad') {
  const token = url.split('/captura/')[1];
  const ini: any = await (await tel('/v1/captura/iniciar', null, { token })).json();
  await tel('/v1/captura/consentimiento', ini.sesion, { version: ini.config.consentimiento_version, texto: 'Autorizo el tratamiento de mis datos biométricos para validar mi identidad y firmar el documento.', otorgado_en: new Date().toISOString() });
  const archivo = await cifrar(ZIP, ini.clave);
  const sub: any = await (await tel('/v1/captura/subida', ini.sesion, { bytes: archivo.length })).json();
  await fetch(sub.url, { method: 'PUT', headers: sub.cabeceras, body: archivo });
  return (await (await tel('/v1/captura/resultado', ini.sesion, {
    resultado: { global: nivel === 'ok' ? 'Identidad validada' : 'Revisar', nivel, huella: { probabilidad: 0.99, nivel }, rostro: { probabilidad: 0.9, prueba_de_vida: true, nivel: nivel === 'bad' ? 'bad' : 'ok' }, firma: { parecido: 60, nivel: nivel === 'bad' ? 'bad' : 'ok' }, run_leido: [runLeido] },
    evidencia_sha256: createHash('sha256').update(ZIP).digest('hex'), bytes_cifrados: archivo.length })).json()) as any;
}

const hooks: any[] = [];
const receptor = createServer((req, res) => {
  let b = ''; req.on('data', (d) => (b += d)); req.on('end', () => {
    hooks.push({ c: JSON.parse(b), firmaOk: req.headers['x-v3p-firma'] === 'sha256=' + createHmac('sha256', WSEC).update(b).digest('hex') });
    res.writeHead(204).end();
  });
});
const hook = async (evento: string, doc: string, n = 1, ms = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const h = hooks.filter((x) => x.c.evento === evento && x.c.documento_id === doc); if (h.length >= n) return h[n - 1]; await esperar(300); }
  return null;
};
const doc = (id: string) => cli('GET', `/v1/documentos/${id}`).then((r) => r.json() as any);
const verificar = (pdf: Buffer) => fetch(`${API}/verificar/api`, { method: 'POST', headers: { 'Content-Type': 'application/pdf' }, body: new Uint8Array(pdf) }).then((r) => r.json() as any);

async function main() {
  await new Promise<void>((r) => receptor.listen(4556, process.env.RECEPTOR_HOST || '127.0.0.1', r));
  const b64 = PDF.toString('base64');
  const base = { nombre: 'Contrato de arriendo', pdf: b64, url_confirmacion: RECEPTOR };
  const A = { rut: '11.111.111-1', nombre: 'Ana Rojas', ubicaciones: [{ pagina: 1, x: 60, y: 650, ancho: 220, alto: 80 }, { pagina: 3, x: 60, y: 600, ancho: 220, alto: 80 }] };
  const B = { rut: '22.222.222-2', nombre: 'Bruno Díaz', ubicaciones: [{ pagina: 3, x: 320, y: 600, ancho: 220, alto: 80 }] };

  // validaciones de entrada
  ok((await cli('POST', '/v1/documentos', { ...base, pdf: Buffer.from('hola mundo').toString('base64'), firmantes: [A] })).status === 400, 'archivo que no es PDF → 400');
  ok((await cli('POST', '/v1/documentos', { ...base, firmantes: [A, { ...B, ubicaciones: [{ pagina: 9, x: 10, y: 10 }] }] })).status === 400, 'ubicación en página inexistente → 400');
  ok((await cli('POST', '/v1/documentos', { ...base, firmantes: [A, { ...B, ubicaciones: [{ pagina: 1, x: 100, y: 660 }] }] })).status === 400, 'recuadros superpuestos → 400');
  ok((await cli('POST', '/v1/documentos', { ...base, firmantes: [A, { ...B, rut: '11111111-1' }] })).status === 400, 'RUT repetido → 400');

  // ---------- orden secuencial: A (2 páginas) y luego B
  const r1 = await cli('POST', '/v1/documentos', { ...base, orden: 'secuencial', referencia: 'SEC-1', firmantes: [A, B] });
  const d1: any = await r1.json();
  ok(r1.status === 201 && d1.estado === 'pendiente' && d1.version === 1, 'documento registrado y sellado (versión 1)');
  ok(d1.enlaces_firmantes[0].url_captura && !d1.enlaces_firmantes[1].url_captura, 'secuencial: solo el primer firmante recibe link');
  ok(d1.firmantes[1].estado === 'en_espera', 'segundo firmante en espera');
  const v0 = await verificar(Buffer.from(await (await cli('GET', `/v1/documentos/${d1.documento_id}/pdf`)).arrayBuffer()));
  ok(v0.valido && v0.firmas_pendientes === 3 && v0.firmas.length === 1, 'recién registrado: sello válido y 3 recuadros pendientes');

  const ra = await telefono(d1.enlaces_firmantes[0].url_captura, '11111111-1', 'ok');
  ok(ra.estado === 'aprobada' && /estampando/.test(ra.documento || ''), 'A valida → aprobada y el teléfono informa que se estampa la firma');
  const turno = await hook('documento.turno', d1.documento_id);
  ok(!!turno?.c.url_captura && turno.firmaOk, 'webhook documento.turno trae el link de B (firma HMAC ok)');
  let e1 = await doc(d1.documento_id);
  ok(e1.version === 2 && e1.firmantes[0].estado === 'firmado' && e1.firmantes[1].estado === 'pendiente', 'A firmó sus 2 recuadros en una versión nueva; ahora es el turno de B');

  const rb = await telefono(turno.c.url_captura, '22222222-2', 'warn');
  ok(rb.estado === 'revision', 'B valida con observaciones → revisión (habilita firma)');
  ok(!!(await hook('documento.completado', d1.documento_id)), 'webhook documento.completado');
  e1 = await doc(d1.documento_id);
  ok(e1.estado === 'completado' && e1.version === 3 && e1.firmantes[1].observaciones === 'validación con observaciones', 'documento completado (v3); B marcado con observaciones');

  const dl = await cli('GET', `/v1/documentos/${d1.documento_id}/pdf`);
  const firmado = Buffer.from(await dl.arrayBuffer());
  writeFileSync(`${SALIDA}/doc-firmado.pdf`, firmado);
  ok(createHash('sha256').update(firmado).digest('hex') === dl.headers.get('x-documento-sha256') && /-firmado\.pdf/.test(dl.headers.get('content-disposition') || ''), 'descarga: hash coincide con la cabecera, nombre "-firmado.pdf"');
  const vf = await verificar(firmado);
  ok(vf.valido && vf.firmas.length === 4 && vf.firmas_pendientes === 0 && vf.firmas.every((f: any) => f.emitida_por_matchoncard), 'verificación pública: sello + 3 firmas válidas y confiables');
  ok(vf.registro.encontrado && vf.registro.es_version_vigente && vf.registro.estado === 'completado', 'verificación encuentra el documento en el registro (versión vigente)');

  // alteración: se cambia el contenido de una página (texto) dentro del archivo firmado
  const s = firmado.toString('latin1');
  const i = s.indexOf('/MediaBox');
  const alterado = Buffer.from(s.slice(0, i) + s.slice(i).replace(/\/MediaBox \[ ?0 0 /, (m) => m.replace('0 0', '0 1')), 'latin1');
  const va = await verificar(alterado);
  ok(!va.valido && !va.registro.encontrado, `PDF alterado → no válido y desconocido para el registro (${va.resumen})`);
  ok((await verificar(PDF)).firmas.length === 0, 'PDF original sin firmas → sin firmas');

  // ---------- orden libre, firmante rechazado y link nuevo
  const d2: any = await (await cli('POST', '/v1/documentos', { ...base, nombre: 'Anexo', firmantes: [A, B] })).json();
  ok(d2.enlaces_firmantes.every((e: any) => e.url_captura), 'libre: todos reciben link de inmediato');
  const rr = await telefono(d2.enlaces_firmantes[1].url_captura, '99999999-9', 'ok');
  ok(rr.estado === 'rechazada', 'B con otra cédula → rechazada');
  const fall = await hook('documento.validacion_fallida', d2.documento_id);
  ok(fall?.c.validacion_estado === 'rechazada', 'webhook documento.validacion_fallida');
  const re: any = await (await cli('POST', `/v1/documentos/${d2.documento_id}/firmantes/${d2.enlaces_firmantes[1].firmante_id}/enlace`)).json();
  ok(!!re.url_captura, 'link nuevo para B');
  await telefono(re.url_captura, '22222222-2', 'ok');
  await hook('documento.firmado', d2.documento_id);
  let e2 = await doc(d2.documento_id);
  ok(e2.firmantes[1].estado === 'firmado' && e2.firmantes[0].estado === 'pendiente', 'B firmó antes que A (orden libre)');
  ok((await cli('POST', `/v1/documentos/${d2.documento_id}/cancelar`, { motivo: 'El cliente desistió del anexo' })).status === 200, 'cancelar documento pendiente');
  e2 = await doc(d2.documento_id);
  ok(e2.estado === 'cancelado' && e2.firmantes[0].estado === 'cancelado', 'firmante restante queda cancelado');
  ok((await tel('/v1/captura/iniciar', null, { token: d2.enlaces_firmantes[0].url_captura.split('/captura/')[1] })).status === 410, 'el link de A deja de servir tras cancelar');
  ok((await cli('POST', `/v1/documentos/${d1.documento_id}/cancelar`, { motivo: 'probar cancelar completado' })).status === 409, 'no se puede cancelar un documento completado');

  const lista: any[] = await (await cli('GET', '/v1/documentos')).json() as any;
  ok(lista.some((x) => x.id === d1.documento_id && x.firmados === 2), 'listado de documentos');
  ok(hooks.every((h) => h.firmaOk), `todos los webhooks con firma válida (${hooks.length})`);
  receptor.close();
  console.log(fallas ? `\n${fallas} pruebas fallaron` : '\nTodas las pruebas pasaron');
  process.exit(fallas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
