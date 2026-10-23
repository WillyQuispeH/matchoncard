# MatchOnCard · Validación en 3 Pasos

Servicio que entrega la validación biométrica (huella, rostro y firma desde el teléfono) como API para Portalfirma.

- **Stack:** NestJS + TypeScript (APIs), Python + pyHanko (firma de PDF), Next.js 16 + Tailwind + Zustand (front). Todo en Docker Compose.
- **Servicios:** `app` (4561), `api` (4560), `api-webhook` (4562) y `api-signature` (interno). Detalle en `DESARROLLO.md`.
- **Datos:** PostgreSQL guarda los metadatos. La evidencia pesada y los PDF van a **Cloudflare R2**, cifrados.
- **Arquitectura:** el detalle está en el documento «Validación en 3 Pasos — Arquitectura de producción y API».

## Cómo funciona

1. **Portalfirma crea la validación.** Llama a `POST /v1/validaciones` con las cabeceras `id` y `Authorization: Bearer <JWT>`, y recibe un `url_captura` para enviar al firmante.
2. **El firmante abre el link** en su teléfono. La API sirve la página de captura, que canjea el token por una sesión de 40 minutos y una clave AES-256 propia de esa validación.
3. **El teléfono captura y compara** la cédula, la huella, el rostro y la firma, igual que en el prototipo. Antes de abrir la cámara se registra el **consentimiento**.
4. **El teléfono sube la evidencia.** Cifra el ZIP con AES-256-GCM y lo sube directo al bucket con una URL firmada de 10 minutos. La API nunca recibe los megabytes.
5. **El teléfono envía el resultado y el SHA-256 del ZIP.** La API:
   - descifra la evidencia y comprueba el hash (`integridad`);
   - compara el RUN leído de la cédula con el RUT esperado;
   - fija el estado final;
   - avisa a Portalfirma con un **webhook firmado**.

**Regla de decisión:** se exigen al menos **2 de 3 factores** correctos (huella, rostro, firma). 3/3 → `aprobada`; 2/3 → `revision` (permite firmar; la estampa dice "validación con observaciones"); menos de 2 → `rechazada`. Si la huella no se puede leer, el titular puede seguir sin ella (motivo `huella_omitida`) y entonces rostro y firma deben coincidir.

**Estados:**

- En curso: `creada` → `en_captura` → `consentida`.
- Finales: `aprobada`, `rechazada` o `revision`.
- Por vencimiento o supresión: `expirada` y `borrada`.

## Endpoints

| Método y ruta | Auth | Descripción |
|---|---|---|
| `POST /v1/validaciones` | cliente, rol `integracion` | `{rut, nombre?, documento_id?, referencia?, callback_url?}` → `{validacion_id, url_captura, expira_en}` |
| `GET /v1/validaciones/:id` | cliente | Estado, puntajes, `evidencia_sha256` e `integridad` |
| `GET /v1/validaciones/:id/evidencia?motivo=…` | rol `auditor` | ZIP descifrado. Cada descarga queda auditada con su motivo |
| `DELETE /v1/validaciones/:id` `{motivo}` | rol `dpo` | Supresión: borra el objeto y destruye la clave |
| `GET /v1/titulares/:rut/validaciones` | rol `dpo` | Derecho de acceso: lista las validaciones de un RUT |
| `GET /captura/:token` | — | Página de captura |
| `POST /v1/captura/iniciar` · `consentimiento` · `subida` · `resultado` | sesión del teléfono | Los usa solo la página de captura |
| `GET /health` | — | Estado de la API y de la base |

### Autenticación de clientes (Portalfirma)

```ts
import * as jwt from 'jsonwebtoken';
const token = jwt.sign({}, process.env.V3P_SECRETO_JWT!, { algorithm: 'HS256', issuer: 'portalfirma', expiresIn: 120 }); // máx. 5 min
await fetch('https://api.matchoncard.cl/v1/validaciones', {
  method: 'POST',
  headers: { id: 'portalfirma', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ rut: '12.345.678-5', nombre: 'Ana Pérez', documento_id: 'DOC-123', callback_url: 'https://integracion.portalfirma.cl/webhooks/v3p' }),
});
```

### Webhook

```ts
// cuerpo: { evento, validacion_id, referencia, documento_id, estado, motivos, puntajes, evidencia_sha256, integridad, verificacion_servidor, fecha }
import { createHmac, timingSafeEqual } from 'crypto';
function firmaValida(cuerpoCrudo: string, cabecera: string) {
  const esperado = 'sha256=' + createHmac('sha256', process.env.V3P_SECRETO_WEBHOOK!).update(cuerpoCrudo).digest('hex');
  return cabecera.length === esperado.length && timingSafeEqual(Buffer.from(cabecera), Buffer.from(esperado));
}
```

- El webhook se reintenta hasta 8 veces, con espera de 1, 2, 4… minutos.
- `X-V3P-Entrega` identifica cada entrega. Úsalo para descartar duplicados.

**Motivos posibles** (`motivos`):

| Motivo | Qué pasó | Estado resultante |
|---|---|---|
| `run_distinto` | La cédula es de otra persona | `rechazada` |
| `run_no_leido` | El OCR no leyó el RUN | Una aprobación pasa a `revision` |
| `hash_distinto` | El hash no coincide | `revision` |
| `evidencia_ilegible` | No se pudo descifrar la evidencia | `revision` |
| `no_es_zip` | El archivo descifrado no es un ZIP | `revision` |

## Firma electrónica de documentos

El cliente integrado entrega el PDF y dónde firma cada persona. MatchOnCard:

1. **Sella el documento** (firma de certificación DocMDP nivel 2). Desde ese momento el PDF solo admite completar los recuadros de firma designados; cualquier otra edición invalida el sello y queda en evidencia.
2. **Crea un link de validación por firmante**. Con orden `libre` todos lo reciben de inmediato; con `secuencial`, cada uno lo recibe cuando firma el anterior (webhook `documento.turno`).
3. Cuando la validación del firmante queda **`aprobada` o `revision`**, se estampa su firma en **todos sus recuadros** (puede firmar en varias páginas). La firma es criptográfica (PAdES, incremental: no rompe las anteriores). La estampa visible muestra su firma dibujada, nombre, RUT, fecha, folio de la validación y hash de la evidencia. Si la validación quedó en `revision`, la estampa dice "Validación con observaciones".
4. Al firmar el último firmante, el documento pasa a `completado` (webhook `documento.completado`).

El PDF se guarda **cifrado** (AES-256-GCM, una clave por documento envuelta con la KEK). Se registra el SHA-256 de cada versión.

| Método y ruta | Rol | Descripción |
|---|---|---|
| `POST /v1/documentos` | `integracion` | Registra y sella el PDF; devuelve los links de los firmantes habilitados |
| `GET /v1/documentos` | `integracion`, `auditor` | Últimos 100 documentos |
| `GET /v1/documentos/:id` | `integracion`, `auditor`, `dpo` | Estado del documento y de cada firmante |
| `GET /v1/documentos/:id/pdf` | `integracion`, `auditor` | Versión vigente (cabeceras `X-Documento-Version` y `X-Documento-Sha256`) |
| `POST /v1/documentos/:id/firmantes/:fid/enlace` | `integracion` | Link nuevo para un firmante pendiente (el anterior deja de servir) |
| `POST /v1/documentos/:id/cancelar` `{motivo}` | `integracion` | Cancela un documento pendiente |
| `DELETE /v1/documentos/:id` `{motivo}` | `dpo` | Supresión: borra todas las versiones y destruye la clave |
| `POST /verificar/api` (cuerpo: el PDF, `Content-Type: application/pdf`) | público | Verifica firmas e integridad. Página: `https://matchoncard.cl/verificar` |

**Coordenadas:** en puntos PDF (1/72 de pulgada). La página empieza en 1 y el origen es la esquina **superior izquierda**. El recuadro mide por defecto 200 × 70 puntos (mínimo 90 × 36). Los recuadros no pueden superponerse. En una hoja A4 (595 × 842), un recuadro abajo a la izquierda sería, por ejemplo, `x: 60, y: 700`.

```ts
await fetch('https://api.matchoncard.cl/v1/documentos', {
  method: 'POST',
  headers: { id: 'portalfirma', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nombre: 'Contrato de arriendo',
    referencia: 'OP-2026-0042',
    orden: 'secuencial',                                  // o 'libre' (por defecto)
    callback_url: 'https://integracion.portalfirma.cl/webhooks/v3p',
    pdf: pdfBuffer.toString('base64'),                    // máx. 25 MB
    firmantes: [
      { rut: '12.345.678-5', nombre: 'Ana Pérez', ubicaciones: [{ pagina: 1, x: 60, y: 700 }, { pagina: 3, x: 60, y: 640 }] },
      { rut: '9.876.543-3', nombre: 'Luis Soto', ubicaciones: [{ pagina: 3, x: 330, y: 640, ancho: 220, alto: 80 }] },
    ],
  }),
});
// → { documento_id, estado: 'pendiente', version: 1, firmantes: [...], enlaces_firmantes: [{ firmante_id, nombre, url_captura, expira_en }] }
```

**Webhooks de documentos** (con la misma firma HMAC; cuerpo `{ evento, documento_id, referencia, nombre, estado, version, sha256, …, fecha }`):

| Evento | Cuándo | Datos extra |
|---|---|---|
| `documento.firmado` | Se estampó la firma de un firmante | `firmante_id`, `orden` |
| `documento.turno` | Orden secuencial: le toca al siguiente | `firmante_id`, `orden`, `url_captura`, `expira_en` |
| `documento.validacion_fallida` | La validación del firmante salió `rechazada` | `firmante_id`, `validacion_id`, `validacion_estado`. Pide un link nuevo si corresponde |
| `documento.completado` | Firmaron todos | — |
| `documento.cancelado` | Se canceló | `motivo` |

Además se siguen enviando los webhooks `validacion.finalizada` de cada validación.

**Certificado:** las firmas usan un certificado propio, "MatchOnCard Firma Electrónica Simple", emitido por la CA "MatchOnCard CA Raíz". Lectores como Adobe muestran la firma como íntegra pero "identidad desconocida", porque esa CA no está en su lista de confianza. La verificación oficial es la de `matchoncard.cl/verificar`. Para que Adobe la muestre en verde hace falta un certificado de una entidad reconocida (por ejemplo, de la lista AATL).

## Puesta en marcha en Linode

1. **Crear los recursos en la misma región (São Paulo, `br-gru`):**
   - una Linode **Dedicated 4 GB** con Ubuntu 24.04 y tu llave SSH;
   - una **Managed PostgreSQL**: base `v3p` y usuario `v3p_app`, con la *allow list* restringida a la IP privada de la Linode;
   - en **Cloudflare R2**: bucket privado `matchoncard` y un token de API de R2 **limitado a ese bucket** (lectura y escritura de objetos); CORS y ciclo de vida según `api/CERTIFICADOS.md`;
   - un **Cloud Firewall** con entrada en 80/443 para todos y 22 solo desde la IP de administración.
2. **Apuntar el DNS** (registros A) de `matchoncard.cl`, `www.matchoncard.cl`, `admin.matchoncard.cl` y `api.matchoncard.cl` a la IP de la Linode.
3. **Configurar y levantar:** clonar el repositorio, crear los `.env`, construir con Docker Compose y configurar nginx con certificados de Let's Encrypt. Los comandos, en orden, están en `DESARROLLO.md` ("Puesta en marcha del servidor"); los certificados de cada servicio, en su `CERTIFICADOS.md`.

   - `crear-cliente.js` imprime el **secreto JWT** y el **secreto de webhook** una sola vez. Guárdalos en el gestor de secretos de Portalfirma.
   - Conviene crear un cliente distinto, solo con `auditor` y `dpo`, para el área legal.
4. **Activar los respaldos:** Backups de Linode en la instancia; la Managed DB los trae incluidos. Antes de salir del piloto, **probar una restauración**.

> **La KEK no se puede perder.** Sin ella, la evidencia es irrecuperable. Guarda una copia offline (gestor de contraseñas de la empresa más un sobre sellado) separada del servidor.

### Actualizar la página de captura

Copia el nuevo `validacion_3_pasos.html` a `app/legacy/` y ejecuta `docker compose build app && docker compose up -d app`.

### Rotar la KEK (anual)

1. En `api/.env.production`: mueve la clave actual a `KEK_PREVIOUS=k1:<base64>` y define `KEK_ID=k2` con una `KEK_BASE64` nueva.
2. Ejecuta `docker compose run --rm --no-deps api node /app/dist/scripts/rotar-kek.js`.
3. Reinicia `api` y quita `KEK_PREVIOUS`.

## Desarrollo y pruebas locales

```bash
cd api && yarn install && yarn build
# Postgres local y el bucket de R2; api/.env ya trae la configuración local
yarn migrar && yarn cliente:crear portalfirma "Portalfirma" integracion,auditor,dpo
yarn start
API_URL=http://127.0.0.1:4561 CLIENTE_ID=portalfirma CLIENTE_SECRETO=… WEBHOOK_SECRETO=… ZIP=prueba.zip yarn test:e2e
```

La prueba de punta a punta (22 verificaciones) recorre todo el ciclo:

- autenticación;
- RUT inválido;
- consentimiento obligatorio;
- subida cifrada;
- integridad;
- RUN distinto;
- hash alterado;
- derecho de acceso;
- supresión con *crypto-shredding*;
- webhooks firmados.

## Seguridad: qué está y qué falta

**Ya incluido:**

- cifrado de sobre (DEK por validación, envuelta con KEK);
- bucket privado con URLs firmadas de tamaño exacto;
- JWT de vida corta por cliente y roles;
- sesión del teléfono limitada a una validación;
- auditoría de solo inserción;
- RUT con hash para búsquedas y enmascarado al mostrarlo;
- *rate limit*;
- validación estricta del JSON;
- logs del proxy sin token ni cabeceras de autenticación;
- contenedor no-root y de solo lectura.

**Fase 2:**

- **re-verificación en servidor:** recalcular huella y firma desde el ZIP con los mismos motores, para no depender del puntaje enviado por el teléfono;
- gestor de secretos o KMS para la KEK;
- alertas sobre la tabla `auditoria`, como descargas inusuales;
- revisión legal de la transferencia a Brasil (Ley 21.719).
