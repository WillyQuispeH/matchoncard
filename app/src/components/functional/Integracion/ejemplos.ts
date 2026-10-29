import type { Muestra } from './Codigo';

// Ejemplos de la documentación de integración. Todos usan la URL de producción.
// Cada solicitud va en cURL, Node.js y Python (en ese orden: las pestañas se sincronizan por nombre).
export const BASE_URL = 'https://api.matchoncard.cl';
export const POSTMAN = '/matchoncard.postman_collection.json';

const CABECERAS_CURL = `  -H "id: $CLIENTE_ID" \\
  -H "Authorization: Bearer $TOKEN"`;

const trio = (curl: string, node: string, python: string): Muestra[] => [
  { lenguaje: 'cURL', codigo: curl },
  { lenguaje: 'Node.js', codigo: node },
  { lenguaje: 'Python', codigo: python },
];
const respuesta = (estado: string, codigo: string): Muestra[] => [{ lenguaje: estado, codigo }];

// ───────── autenticación ─────────

export const autenticacion: Muestra[] = [
  ...trio(
    `# genera $TOKEN con openssl (vida 120 s) y úsalo en los ejemplos cURL
CLIENTE_ID="mi-empresa"
SECRETO_JWT="tu-secreto-jwt"

b64url() { openssl base64 -e -A | tr '+/' '-_' | tr -d '='; }
AHORA=$(date +%s)
CABEZA=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
CUERPO=$(printf '{"iss":"%s","iat":%d,"exp":%d}' "$CLIENTE_ID" "$AHORA" "$((AHORA + 120))" | b64url)
FIRMA=$(printf '%s.%s' "$CABEZA" "$CUERPO" | openssl dgst -sha256 -hmac "$SECRETO_JWT" -binary | b64url)
TOKEN="$CABEZA.$CUERPO.$FIRMA"`,
    `import jwt from 'jsonwebtoken';

const CLIENTE_ID = process.env.MOC_CLIENTE_ID;   // ej. "mi-empresa"
const SECRETO = process.env.MOC_SECRETO_JWT;

// Un JWT nuevo por solicitud: HS256, iss = id del cliente, vida ≤ 300 s
function cabeceras() {
  const token = jwt.sign({}, SECRETO, { algorithm: 'HS256', issuer: CLIENTE_ID, expiresIn: 120 });
  return { id: CLIENTE_ID, Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' };
}`,
    `import os, time, jwt  # pip install pyjwt requests

CLIENTE_ID = os.environ["MOC_CLIENTE_ID"]
SECRETO = os.environ["MOC_SECRETO_JWT"]

def cabeceras():
    ahora = int(time.time())
    token = jwt.encode({"iss": CLIENTE_ID, "iat": ahora, "exp": ahora + 120}, SECRETO, algorithm="HS256")
    return {"id": CLIENTE_ID, "Authorization": f"Bearer {token}", "Content-Type": "application/json"}`,
  ),
  {
    lenguaje: 'PHP',
    codigo: `<?php
// composer require firebase/php-jwt
use Firebase\\JWT\\JWT;

$clienteId = getenv('MOC_CLIENTE_ID');
$ahora = time();
$token = JWT::encode(['iss' => $clienteId, 'iat' => $ahora, 'exp' => $ahora + 120], getenv('MOC_SECRETO_JWT'), 'HS256');

$cabeceras = ["id: $clienteId", "Authorization: Bearer $token", 'Content-Type: application/json'];`,
  },
];

// ───────── validaciones ─────────

export const crearValidacion = trio(
  `curl -X POST ${BASE_URL}/v1/validaciones \\
${CABECERAS_CURL} \\
  -H "Content-Type: application/json" \\
  -d '{
    "rut": "12.345.678-5",
    "nombre": "Ana Pérez",
    "referencia": "OP-2026-0042",
    "url_confirmacion": "https://tu-empresa.cl/webhooks/matchoncard",
    "url_retorno": "https://tu-empresa.cl/firma/listo"
  }'`,
  `const r = await fetch('${BASE_URL}/v1/validaciones', {
  method: 'POST',
  headers: cabeceras(),
  body: JSON.stringify({
    rut: '12.345.678-5',
    nombre: 'Ana Pérez',
    referencia: 'OP-2026-0042',
    url_confirmacion: 'https://tu-empresa.cl/webhooks/matchoncard',
    url_retorno: 'https://tu-empresa.cl/firma/listo',
  }),
});
const { validacion_id, url_captura } = await r.json();
// envía url_captura al firmante (email, SMS, WhatsApp o un botón en tu web)`,
  `import requests

r = requests.post("${BASE_URL}/v1/validaciones", headers=cabeceras(), json={
    "rut": "12.345.678-5",
    "nombre": "Ana Pérez",
    "referencia": "OP-2026-0042",
    "url_confirmacion": "https://tu-empresa.cl/webhooks/matchoncard",
    "url_retorno": "https://tu-empresa.cl/firma/listo",
})
r.raise_for_status()
v = r.json()
print(v["url_captura"])`,
);

export const respuestaCrearValidacion = respuesta('201 Created', `{
  "validacion_id": "6f1c2a9e-3b7d-4c55-9a0e-1f2b3c4d5e6f",
  "estado": "creada",
  "url_captura": "${BASE_URL}/captura/Xr4…kQ",
  "expira_en": "2026-10-27T15:04:05.000Z"
}`);

export const obtenerValidacion = trio(
  `curl ${BASE_URL}/v1/validaciones/$VALIDACION_ID \\
${CABECERAS_CURL}`,
  `const r = await fetch(\`${BASE_URL}/v1/validaciones/\${validacionId}\`, { headers: cabeceras() });
const v = await r.json();
if (v.estado === 'aprobada') { /* continuar */ }`,
  `r = requests.get(f"${BASE_URL}/v1/validaciones/{validacion_id}", headers=cabeceras())
v = r.json()
if v["estado"] == "aprobada":
    pass  # continuar`,
);

export const respuestaValidacion = respuesta('200 OK', `{
  "validacion_id": "6f1c2a9e-3b7d-4c55-9a0e-1f2b3c4d5e6f",
  "estado": "aprobada",
  "motivos": [],
  "rut": "****678-5",
  "documento_id": null,
  "referencia": "OP-2026-0042",
  "veredicto_dispositivo": "Identidad confirmada",
  "puntajes": { "huella": 0.99, "rostro": 0.93, "prueba_de_vida": true, "firma": 54 },
  "evidencia_sha256": "9f2c4e…a1",
  "integridad": "ok",
  "verificacion_servidor": null,
  "consentimiento": {
    "version": "2026-10-api",
    "otorgado_en": "2026-10-26T15:01:12.000Z",
    "recibido_en": "2026-10-26T15:01:12.480Z"
  },
  "creada_en": "2026-10-26T15:00:00.000Z",
  "actualizada_en": "2026-10-26T15:04:40.000Z",
  "retener_hasta": "2031-10-26T15:04:40.000Z"
}`);

export const evidencia = trio(
  `curl -G ${BASE_URL}/v1/validaciones/$VALIDACION_ID/evidencia \\
  --data-urlencode "motivo=Peritaje solicitado por el área legal" \\
${CABECERAS_CURL} \\
  -o evidencia.zip`,
  `import { writeFile } from 'node:fs/promises';

const motivo = encodeURIComponent('Peritaje solicitado por el área legal');
const r = await fetch(\`${BASE_URL}/v1/validaciones/\${validacionId}/evidencia?motivo=\${motivo}\`, { headers: cabeceras() });
if (!r.ok) throw new Error(\`Error \${r.status}\`);
await writeFile('evidencia.zip', Buffer.from(await r.arrayBuffer()));`,
  `r = requests.get(
    f"${BASE_URL}/v1/validaciones/{validacion_id}/evidencia",
    params={"motivo": "Peritaje solicitado por el área legal"},
    headers=cabeceras(),
)
r.raise_for_status()
with open("evidencia.zip", "wb") as f:
    f.write(r.content)`,
);

export const borrarValidacion = trio(
  `curl -X DELETE ${BASE_URL}/v1/validaciones/$VALIDACION_ID \\
${CABECERAS_CURL} \\
  -H "Content-Type: application/json" \\
  -d '{ "motivo": "Solicitud de supresión del titular" }'`,
  `const r = await fetch(\`${BASE_URL}/v1/validaciones/\${validacionId}\`, {
  method: 'DELETE',
  headers: cabeceras(),
  body: JSON.stringify({ motivo: 'Solicitud de supresión del titular' }),
});`,
  `r = requests.delete(
    f"${BASE_URL}/v1/validaciones/{validacion_id}",
    headers=cabeceras(),
    json={"motivo": "Solicitud de supresión del titular"},
)`,
);

export const respuestaBorrarValidacion = respuesta('200 OK', `{ "validacion_id": "6f1c2a9e-…", "estado": "borrada" }`);

export const titular = trio(
  `curl ${BASE_URL}/v1/titulares/12345678-5/validaciones \\
${CABECERAS_CURL}`,
  `const r = await fetch(\`${BASE_URL}/v1/titulares/\${rut}/validaciones\`, { headers: cabeceras() });
const { validaciones } = await r.json();`,
  `r = requests.get(f"${BASE_URL}/v1/titulares/{rut}/validaciones", headers=cabeceras())
validaciones = r.json()["validaciones"]`,
);

export const respuestaTitular = respuesta('200 OK', `{
  "rut": "****678-5",
  "validaciones": [ { "validacion_id": "…", "estado": "aprobada", … } ]
}`);

// ───────── documentos ─────────

export const crearDocumento = trio(
  `PDF=$(base64 -w0 contrato.pdf)   # en macOS: base64 -i contrato.pdf
curl -X POST ${BASE_URL}/v1/documentos \\
${CABECERAS_CURL} \\
  -H "Content-Type: application/json" \\
  -d @- <<EOF
{
  "nombre": "Contrato de arriendo",
  "referencia": "OP-2026-0042",
  "orden": "secuencial",
  "url_confirmacion": "https://tu-empresa.cl/webhooks/matchoncard",
  "url_retorno": "https://tu-empresa.cl/firma/listo",
  "pdf": "$PDF",
  "firmantes": [
    { "rut": "12.345.678-5", "nombre": "Ana Pérez",
      "ubicaciones": [{ "pagina": 1, "x": 60, "y": 700 }] },
    { "rut": "9.876.543-3", "nombre": "Luis Soto",
      "ubicaciones": [{ "pagina": 3, "x": 330, "y": 640 }] }
  ]
}
EOF`,
  `import { readFile } from 'node:fs/promises';

const pdf = await readFile('contrato.pdf');
const r = await fetch('${BASE_URL}/v1/documentos', {
  method: 'POST',
  headers: cabeceras(),
  body: JSON.stringify({
    nombre: 'Contrato de arriendo',
    referencia: 'OP-2026-0042',
    orden: 'secuencial',                       // o 'libre' (por defecto)
    url_confirmacion: 'https://tu-empresa.cl/webhooks/matchoncard',
    url_retorno: 'https://tu-empresa.cl/firma/listo',
    pdf: pdf.toString('base64'),               // máx. 25 MB
    firmantes: [
      { rut: '12.345.678-5', nombre: 'Ana Pérez',
        ubicaciones: [{ pagina: 1, x: 60, y: 700 }, { pagina: 3, x: 60, y: 640 }] },
      { rut: '9.876.543-3', nombre: 'Luis Soto',
        ubicaciones: [{ pagina: 3, x: 330, y: 640, ancho: 220, alto: 80 }] },
    ],
  }),
});
const doc = await r.json();
// doc.enlaces_firmantes → un url_captura por firmante habilitado`,
  `import base64, requests

with open("contrato.pdf", "rb") as f:
    pdf = base64.b64encode(f.read()).decode()

r = requests.post("${BASE_URL}/v1/documentos", headers=cabeceras(), json={
    "nombre": "Contrato de arriendo",
    "referencia": "OP-2026-0042",
    "orden": "secuencial",
    "url_confirmacion": "https://tu-empresa.cl/webhooks/matchoncard",
    "url_retorno": "https://tu-empresa.cl/firma/listo",
    "pdf": pdf,
    "firmantes": [
        {"rut": "12.345.678-5", "nombre": "Ana Pérez",
         "ubicaciones": [{"pagina": 1, "x": 60, "y": 700}]},
        {"rut": "9.876.543-3", "nombre": "Luis Soto",
         "ubicaciones": [{"pagina": 3, "x": 330, "y": 640}]},
    ],
})
doc = r.json()`,
);

export const respuestaDocumento = respuesta('201 Created', `{
  "documento_id": "b2e0…",
  "nombre": "Contrato de arriendo",
  "referencia": "OP-2026-0042",
  "estado": "pendiente",
  "orden": "secuencial",
  "paginas": 3,
  "version": 1,
  "sha256_original": "4c1d…",
  "sha256_actual": "e7a9…",
  "firmantes": [
    { "firmante_id": "a1…", "orden": 1, "nombre": "Ana Pérez", "rut": "****678-5",
      "estado": "pendiente", "validacion_id": "6f1c…", "validacion_estado": "creada", … },
    { "firmante_id": "a2…", "orden": 2, "nombre": "Luis Soto", "rut": "****543-3",
      "estado": "en_espera", "validacion_id": null, … }
  ],
  "enlaces_firmantes": [
    { "firmante_id": "a1…", "orden": 1, "nombre": "Ana Pérez",
      "url_captura": "${BASE_URL}/captura/…", "expira_en": "2026-10-27T15:04:05.000Z" },
    { "firmante_id": "a2…", "orden": 2, "nombre": "Luis Soto",
      "url_captura": null, "expira_en": null }
  ]
}`);

export const listarDocumentos = trio(
  `curl ${BASE_URL}/v1/documentos \\
${CABECERAS_CURL}`,
  `const documentos = await (await fetch('${BASE_URL}/v1/documentos', { headers: cabeceras() })).json();`,
  `documentos = requests.get("${BASE_URL}/v1/documentos", headers=cabeceras()).json()`,
);

export const respuestaListarDocumentos = respuesta('200 OK', `[
  { "id": "b2e0…", "nombre": "Contrato de arriendo", "referencia": "OP-2026-0042",
    "estado": "pendiente", "orden": "secuencial", "version": 2,
    "creado_en": "…", "completado_en": null, "firmantes": 2, "firmados": 1 }
]`);

export const obtenerDocumento = trio(
  `curl ${BASE_URL}/v1/documentos/$DOCUMENTO_ID \\
${CABECERAS_CURL}`,
  `const doc = await (await fetch(\`${BASE_URL}/v1/documentos/\${documentoId}\`, { headers: cabeceras() })).json();
const pendientes = doc.firmantes.filter((f) => f.estado !== 'firmado');`,
  `doc = requests.get(f"${BASE_URL}/v1/documentos/{documento_id}", headers=cabeceras()).json()
pendientes = [f for f in doc["firmantes"] if f["estado"] != "firmado"]`,
);

export const descargarPdf = trio(
  `curl ${BASE_URL}/v1/documentos/$DOCUMENTO_ID/pdf \\
${CABECERAS_CURL} \\
  -D cabeceras.txt -o contrato-firmado.pdf

# cabeceras.txt incluye X-Documento-Version y X-Documento-Sha256`,
  `import { writeFile } from 'node:fs/promises';

const r = await fetch(\`${BASE_URL}/v1/documentos/\${documentoId}/pdf\`, { headers: cabeceras() });
const version = r.headers.get('X-Documento-Version');
const sha256 = r.headers.get('X-Documento-Sha256');
await writeFile(\`contrato-v\${version}.pdf\`, Buffer.from(await r.arrayBuffer()));`,
  `r = requests.get(f"${BASE_URL}/v1/documentos/{documento_id}/pdf", headers=cabeceras())
r.raise_for_status()
version = r.headers["X-Documento-Version"]
sha256 = r.headers["X-Documento-Sha256"]
with open(f"contrato-v{version}.pdf", "wb") as f:
    f.write(r.content)`,
);

export const reenviarEnlace = trio(
  `curl -X POST ${BASE_URL}/v1/documentos/$DOCUMENTO_ID/firmantes/$FIRMANTE_ID/enlace \\
${CABECERAS_CURL}`,
  `const r = await fetch(\`${BASE_URL}/v1/documentos/\${documentoId}/firmantes/\${firmanteId}/enlace\`, {
  method: 'POST',
  headers: cabeceras(),
});
const { url_captura } = await r.json();`,
  `r = requests.post(
    f"${BASE_URL}/v1/documentos/{documento_id}/firmantes/{firmante_id}/enlace",
    headers=cabeceras(),
)
url_captura = r.json()["url_captura"]`,
);

export const respuestaReenviarEnlace = respuesta('200 OK', `{
  "firmante_id": "a1…",
  "url_captura": "${BASE_URL}/captura/…",
  "expira_en": "2026-10-27T15:04:05.000Z",
  "validacion_id": "7d2e…"
}`);

export const cancelarDocumento = trio(
  `curl -X POST ${BASE_URL}/v1/documentos/$DOCUMENTO_ID/cancelar \\
${CABECERAS_CURL} \\
  -H "Content-Type: application/json" \\
  -d '{ "motivo": "El cliente desistió de la operación" }'`,
  `await fetch(\`${BASE_URL}/v1/documentos/\${documentoId}/cancelar\`, {
  method: 'POST',
  headers: cabeceras(),
  body: JSON.stringify({ motivo: 'El cliente desistió de la operación' }),
});`,
  `requests.post(
    f"${BASE_URL}/v1/documentos/{documento_id}/cancelar",
    headers=cabeceras(),
    json={"motivo": "El cliente desistió de la operación"},
)`,
);

export const suprimirDocumento = trio(
  `curl -X DELETE ${BASE_URL}/v1/documentos/$DOCUMENTO_ID \\
${CABECERAS_CURL} \\
  -H "Content-Type: application/json" \\
  -d '{ "motivo": "Fin del plazo de conservación acordado" }'`,
  `await fetch(\`${BASE_URL}/v1/documentos/\${documentoId}\`, {
  method: 'DELETE',
  headers: cabeceras(),
  body: JSON.stringify({ motivo: 'Fin del plazo de conservación acordado' }),
});`,
  `requests.delete(
    f"${BASE_URL}/v1/documentos/{documento_id}",
    headers=cabeceras(),
    json={"motivo": "Fin del plazo de conservación acordado"},
)`,
);

export const verificarPdf = trio(
  `curl -X POST ${BASE_URL}/verificar/api \\
  -H "Content-Type: application/pdf" \\
  --data-binary @contrato-firmado.pdf`,
  `import { readFile } from 'node:fs/promises';

// público: sin credenciales
const r = await fetch('${BASE_URL}/verificar/api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/pdf' },
  body: await readFile('contrato-firmado.pdf'),
});
const resultado = await r.json();`,
  `# público: sin credenciales
with open("contrato-firmado.pdf", "rb") as f:
    r = requests.post("${BASE_URL}/verificar/api", data=f, headers={"Content-Type": "application/pdf"})
resultado = r.json()`,
);

// ───────── webhooks ─────────

export const webhookValidacion: Muestra[] = [{
  lenguaje: 'validacion.finalizada',
  codigo: `POST https://tu-empresa.cl/webhooks/matchoncard
Content-Type: application/json
X-V3P-Evento: validacion.finalizada
X-V3P-Entrega: 1842
X-V3P-Firma: sha256=5b0f…c9

{
  "evento": "validacion.finalizada",
  "validacion_id": "6f1c2a9e-3b7d-4c55-9a0e-1f2b3c4d5e6f",
  "referencia": "OP-2026-0042",
  "documento_id": null,
  "estado": "aprobada",
  "motivos": [],
  "veredicto_dispositivo": "Identidad confirmada",
  "puntajes": { "huella": 0.99, "rostro": 0.93, "prueba_de_vida": true, "firma": 54 },
  "evidencia_sha256": "9f2c4e…a1",
  "integridad": "ok",
  "verificacion_servidor": null,
  "fecha": "2026-10-26T15:04:41.120Z"
}`,
}, {
  lenguaje: 'documento.turno',
  codigo: `{
  "evento": "documento.turno",
  "documento_id": "b2e0…",
  "referencia": "OP-2026-0042",
  "nombre": "Contrato de arriendo",
  "estado": "pendiente",
  "version": 2,
  "sha256": "e7a9…",
  "firmante_id": "a2…",
  "orden": 2,
  "url_captura": "${BASE_URL}/captura/…",
  "expira_en": "2026-10-27T16:10:00.000Z",
  "fecha": "2026-10-26T16:10:00.000Z"
}`,
}, {
  lenguaje: 'documento.completado',
  codigo: `{
  "evento": "documento.completado",
  "documento_id": "b2e0…",
  "referencia": "OP-2026-0042",
  "nombre": "Contrato de arriendo",
  "estado": "completado",
  "version": 3,
  "sha256": "0d4b…",
  "fecha": "2026-10-26T16:22:13.000Z"
}`,
}];

export const verificarWebhook: Muestra[] = [
  ...trio(
    `# Prueba tu endpoint: simula un webhook firmado igual que MatchOnCard
SECRETO_WEBHOOK="tu-secreto-webhook"
CUERPO='{"evento":"validacion.finalizada","validacion_id":"6f1c2a9e-3b7d-4c55-9a0e-1f2b3c4d5e6f","estado":"aprobada","motivos":[]}'
FIRMA="sha256=$(printf '%s' "$CUERPO" | openssl dgst -sha256 -hmac "$SECRETO_WEBHOOK" | sed 's/^.* //')"

curl -X POST http://localhost:3000/webhooks/matchoncard \\
  -H "Content-Type: application/json" \\
  -H "X-V3P-Evento: validacion.finalizada" \\
  -H "X-V3P-Entrega: prueba-1" \\
  -H "X-V3P-Firma: $FIRMA" \\
  -d "$CUERPO"`,
    `import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

const app = express();
const vistos = new Set();   // en producción: tabla con X-V3P-Entrega

// importante: el cuerpo CRUDO, tal como llegó (no el JSON re-serializado)
app.post('/webhooks/matchoncard', express.raw({ type: 'application/json' }), (req, res) => {
  const esperado = 'sha256=' + createHmac('sha256', process.env.MOC_SECRETO_WEBHOOK)
    .update(req.body).digest('hex');
  const recibido = req.get('X-V3P-Firma') || '';
  if (recibido.length !== esperado.length || !timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado)))
    return res.sendStatus(401);

  const entrega = req.get('X-V3P-Entrega');
  if (vistos.has(entrega)) return res.sendStatus(200);   // duplicado: ya procesado
  vistos.add(entrega);

  const evento = JSON.parse(req.body.toString('utf8'));
  if (evento.evento === 'validacion.finalizada') {
    // aprobada → continuar · revision → continuar con observaciones · rechazada → detener
  }
  res.sendStatus(200);   // responde rápido (≤ 10 s); el trabajo pesado, en segundo plano
});`,
    `import hmac, hashlib, os
from flask import Flask, request, abort

app = Flask(__name__)
SECRETO = os.environ["MOC_SECRETO_WEBHOOK"].encode()

@app.post("/webhooks/matchoncard")
def webhook():
    crudo = request.get_data()   # cuerpo crudo
    esperado = "sha256=" + hmac.new(SECRETO, crudo, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(request.headers.get("X-V3P-Firma", ""), esperado):
        abort(401)
    evento = request.get_json()
    # descarta duplicados con request.headers["X-V3P-Entrega"]
    return "", 200`,
  ),
  {
    lenguaje: 'PHP',
    codigo: `<?php
$crudo = file_get_contents('php://input');
$esperado = 'sha256=' . hash_hmac('sha256', $crudo, getenv('MOC_SECRETO_WEBHOOK'));
if (!hash_equals($esperado, $_SERVER['HTTP_X_V3P_FIRMA'] ?? '')) {
  http_response_code(401);
  exit;
}
$evento = json_decode($crudo, true);
// descarta duplicados con $_SERVER['HTTP_X_V3P_ENTREGA']
http_response_code(200);`,
  },
];

// ───────── errores ─────────

export const errores: Muestra[] = [{
  lenguaje: '400 Bad Request',
  codigo: `{
  "statusCode": 400,
  "message": ["rut must be longer than or equal to 8 characters"],
  "error": "Bad Request"
}`,
}, {
  lenguaje: '401 Unauthorized',
  codigo: `{
  "statusCode": 401,
  "message": "JWT inválido o vencido",
  "error": "Unauthorized"
}`,
}, {
  lenguaje: '409 Conflict',
  codigo: `{
  "statusCode": 409,
  "message": "Aún no es el turno de este firmante (orden secuencial)",
  "error": "Conflict"
}`,
}];
