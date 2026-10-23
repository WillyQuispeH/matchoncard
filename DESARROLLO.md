# Guía para desarrolladores · MatchOnCard (Validación en 3 Pasos)

Validación de identidad contra la cédula chilena con **huella, rostro y firma**. A partir de esa validación se hace la **firma electrónica de documentos PDF**. El `README.md` tiene la referencia de la API, los webhooks y la puesta en marcha. Esta guía explica cómo está armado el sistema y cómo trabajar en él.

## Producción

| URL | Qué es |
|---|---|
| `https://matchoncard.cl` | Landing (Next.js, `app/src/components/functional/Landing`) |
| `https://matchoncard.cl/demo` | App de captura en modo local (no guarda nada) |
| `https://admin.matchoncard.cl` | Administración (app-admin). `matchoncard.cl/panel` redirige aquí |
| `https://matchoncard.cl/verificar` | Verificación pública de PDF firmados |
| `https://api.matchoncard.cl` | API y links de captura (`/captura/<token>`) |

Infraestructura en Linode (São Paulo): una VM con Docker Compose y PostgreSQL administrado. La evidencia y los PDF van a Cloudflare R2 (bucket `matchoncard`). nginx corre en el servidor (fuera de Docker), termina el TLS (Let's Encrypt) y reenvía `matchoncard.cl` y `api.matchoncard.cl` a `127.0.0.1:4561` (app) y `admin.matchoncard.cl` a `127.0.0.1:4564` (app-admin). La configuración está en `nginx/`.

## Servicios (`docker-compose.yml`)

| Servicio | Imagen | Puerto | Qué hace |
|---|---|---|---|
| `app` | `matchoncard/app:1.0.0` | `127.0.0.1:4561` | Next.js 16 (App Router, TypeScript, Tailwind, Zustand, axios): landing, `/panel`, `/verificar`, `/demo` y `/captura/<token>`, con sus cabeceras (CSP, no-store). Route Handlers que reenvían a la API por streaming en el mismo origen (`/v1`, `/panel/api`, `/verificar/api`, `/health`) |
| `app-admin` | `matchoncard/app-admin:1.0.0` | `127.0.0.1:4564` | Next.js: administración (clientes, usuarios, validaciones, documentos, webhooks, auditoría). Reenvía `/admin/api` a la API |
| `api` | `matchoncard/api:1.0.0` | interno `4560` | API principal (NestJS): validaciones, captura, documentos, panel, retención, firma tras la validación |
| `api-webhook` | `matchoncard/api-webhook:1.0.0` | interno `4562` | Emisor de webhooks: recibe de la API cada aviso ya firmado con HMAC (`POST /entregar`) y hace la llamada al cliente. Sin base de datos ni KEK |
| `api-signature` | `matchoncard/api-signature:1.0.0` | interno `4563` | Python + pyHanko. Red `interna` sin salida a Internet; solo `api` lo alcanza |

## Arquitectura

```
Teléfono del firmante ── app/legacy/validacion_3_pasos.html  (FPEngine + face-api + SigEngine, todo en el teléfono)
   │  1) canjea el token por una sesión y una clave AES  2) consentimiento  3) sube la evidencia CIFRADA directo al bucket
   ▼
app (Next.js, mismo origen) ──► api (NestJS) ── PostgreSQL (estados, hashes, auditoría, cola de webhooks; nunca imágenes)
                                │            └─ Cloudflare R2 (evidencia y PDF cifrados con AES-256-GCM; una clave por objeto, envuelta con la KEK)
                                ├─ api-signature (Python + pyHanko, red interna): sella el PDF (DocMDP nivel 2) y estampa firmas PAdES incrementales
                                └─ HTTP interno ──► api-webhook ──► webhooks firmados con HMAC al cliente (Portalfirma)
```

## Estructura

Cada API sigue la misma estructura de carpetas (la de las APIs de Portalfirma), con NestJS:

```
api/
  src/
    controllers/   rutas (decoradores de Nest) — sin lógica
    models/        lógica de negocio y acceso a datos (providers de Nest)
    queries/       SQL (constantes; nada de SQL dentro de models)
    schemas/       validación de la entrada (DTO con class-validator)
    middlewares/   guards (cliente JWT, sesión del teléfono, admin), decoradores, helmet y CORS
    interfaces/    tipos compartidos
    data/          constantes (estados, textos del informe, límites)
    utils/         config, base de datos, cifrado, bucket R2, cliente de api-signature
    scripts/       migración, clientes, admins, bucket, rotación de KEK, pruebas e2e
    app.ts         módulo de Nest
    server.ts      arranque
  sql/schema.sql   esquema idempotente
  Dockerfile  package.json  tsconfig.json  .env  .env.production
```

El front (`app/`) sigue la guía de Portalfirma para Next.js. Las capas van así: página → componente funcional → hook → store (Zustand) → service → `utils/api.ts` (axios) → Route Handler de Next → API.

```
app/
  src/
    app/                          App Router: páginas delgadas (un componente cada una) y Route Handlers
      page.tsx  panel/page.tsx  verificar/page.tsx
      captura/[token]/route.ts  demo/route.ts          captura (fase 1: HTML de legacy/ tal cual)
      v1/[...ruta]/route.ts  panel/api/[...ruta]/route.ts  verificar/api/route.ts  health/route.ts   proxy a la API
    components/
      ui/                         Button, InputText, InputSelect, Table, Modal, Drawer, Badge, Spinner… (sin lógica)
      layout/                     SiteHeader, SiteFooter, PanelHeader, Wrap
      functional/                 Landing/, Verificar/, Panel/ (Validaciones/, Documentos/, Documentos/Editor/)
    store/
      interfaces/ services/ zustand/ hooks/        {entidad}.interface.ts · .service.ts · .store.ts · use{Entidad}.hook.ts
    styles/globals.css            tema de Tailwind (colores y tipografías de MatchOnCard)
    utils/                        api.ts (axios único), config.ts (único acceso a process.env), proxy.ts, captura.ts, formato.ts…
  legacy/validacion_3_pasos.html
  next.config.ts                  output standalone + cabeceras de seguridad por página
```

Reglas del front:
- Los componentes nunca importan un store: usan su hook.
- Los services no manejan errores; el store lo hace con `onLoading`, `onError` y `error`.
- La sesión del panel es la cookie `httpOnly` de la API, con `SameSite=Strict` y la cabecera `X-Panel`. **No** se usa `localStorage` ni se decodifica el JWT en el navegador.
- El navegador nunca habla con otro origen: no hay variables `NEXT_PUBLIC_*`. `API_INTERNAL_URL` solo la usa el servidor.

| Dónde | Qué hay |
|---|---|
| `api/src/models/captura.ts` | Ciclo de una validación. La regla de decisión está en `resultado()` |
| `api/src/models/documentos.ts` | Registro de PDF, firmantes, orden libre o secuencial, firma tras la validación, verificación pública |
| `api/src/models/panel.ts`, `operacion.ts`, `informe.ts` | Panel: sesión de admin (scrypt + cookie), revisión de la evidencia, informe PDF |
| `api/src/models/webhooks.ts` | Cola de webhooks: arma el cuerpo, lo encola, firma con HMAC y reintenta (1, 2, 4… min, hasta 8). Repasa cada 30 s |
| `api-webhook/src/models/emisor.ts` | Llamada HTTP al cliente con el cuerpo y la firma que le pasa la API. No guarda nada |
| `api-signature/` | Servicio de firma de PDF y creación de la CA propia (`crear_certificado.py`) |
| `app/src/` | Front en Next.js (estructura abajo) |
| `app/legacy/validacion_3_pasos.html` | App de captura en un solo archivo. **Fase 1:** Next la sirve tal cual (`src/app/captura/[token]/route.ts`, `src/app/demo/route.ts`). **Fase 2:** pasará a componentes sin tocar FPEngine ni SigEngine |
| `nginx/` | Configuración de nginx del servidor: un sitio por dominio, TLS, proxy y logs sin tokens |
| `deploy/crear-firma.sh` | Creación (una vez) de la CA propia y del certificado de firma en el servidor |
| `experimentos/` | Variantes de prueba que no están en producción (ver su README) |

## Reglas que no se negocian

1. **Ningún secreto en el repositorio:** nada de `.env` ni `.env.production`, `secrets/`, `firma/` ni archivos `.p12`, `.pem` o `.key` (están en `.gitignore`). Si un secreto se filtra, se rota.
2. **Ningún dato real en el repositorio ni en las pruebas.** Las evidencias (fotos de cédula, huella, rostro, firma) son datos biométricos, sensibles según la Ley 21.719. Para probar, usa datos sintéticos o tus propias capturas, y fuera del repositorio.
3. **El FPEngine (dentro de `validacion_3_pasos.html`) no se modifica sin acuerdo previo.** Las mejoras de experiencia van en las capas de UX y de modo API.
4. **Regla de decisión:** se exigen al menos **2 de 3 factores** correctos (huella, rostro, firma): 3/3 queda `aprobada`, 2/3 queda `revision` (puede firmar "con observaciones") y menos de 2 queda `rechazada`. Se aplica en el teléfono (`overall()`) y en el servidor.
5. **Toda acción sobre evidencia o documentos se audita** en la tabla `auditoria`. Si agregas una acción nueva, regístrala.

## Desarrollo local

Necesitas Node 22 con yarn, PostgreSQL 16 y Python 3.11 o más nuevo para api-signature. El almacenamiento es el bucket de Cloudflare R2 (credenciales en `api/.env`).

Todos los servicios se trabajan igual que en portal-firma-vehicle: `yarn dev` con nodemon (recarga al guardar) y `yarn build`.

Cada servicio tiene dos archivos de variables, y ninguno va a git:

| Archivo | Para qué |
|---|---|
| `.env` | Desarrollo local (`yarn dev` y los scripts) |
| `.env.production` | Producción: lo lee `docker-compose.yml` en el servidor |

| Servicio | `yarn dev` | Puerto | `.env` local |
|---|---|---|---|
| `api` | `nodemon src/server.ts` (ts-node) | 4560 | PostgreSQL local en `127.0.0.1:5432` (base `matchoncard`), bucket R2 `matchoncard`, `PUBLIC_URL=http://127.0.0.1:4561`, `ALLOW_HTTP_CALLBACKS=true` |
| `api-webhook` | `nodemon src/server.ts` (ts-node) | 4562 | Sin base de datos ni KEK; la API lo llama por `WEBHOOK_SERVICE_URL=http://127.0.0.1:4562` |
| `api-signature` | nodemon + uvicorn (vigila `firmador.py`) | 4563 | Certificado de prueba en `./tmp-firma` y la fuente Arial de Windows |
| `app` | `next dev` | 4561 | `API_INTERNAL_URL=http://127.0.0.1:4560` |
| `app-admin` | `next dev` | 4564 | `API_INTERNAL_URL=http://127.0.0.1:4560` |

Las claves de los `.env` locales son aleatorias y solo sirven en tu equipo. En `app` y `app-admin`, `next build` y `next start` también cargan `.env.production`; para probar en local usa `yarn dev`.

```bash
cd api-signature && yarn install && yarn setup && yarn certificado   # dependencias de Python + certificado de PRUEBA en ./tmp-firma
cd api && yarn install && yarn migrar && yarn cliente:crear portalfirma "Portalfirma" integracion,auditor,dpo
ADMIN_CLAVE='una-clave-larga-de-prueba' yarn admin:crear admin
# luego, en una terminal por servicio:
yarn dev        # en api, api-webhook, api-signature y app
```

Los scripts de la API (`migrar`, `cliente:crear`, `admin:crear`, `bucket:configurar`, `kek:rotar`, `test:e2e`, `test:documentos`) corren con ts-node y leen `api/.env`. En Docker (leen `api/.env.production`) se usan los compilados: `node /app/dist/scripts/<script>.js`.

**Pruebas de punta a punta** (contra la entrada pública, `app`, con la API, api-webhook y api-signature en marcha):

```bash
API_URL=http://127.0.0.1:4561 CLIENTE_ID=portalfirma CLIENTE_SECRETO=... WEBHOOK_SECRETO=... ZIP=evidencia-de-prueba.zip yarn test:e2e
API_URL=... CLIENTE_ID=... CLIENTE_SECRETO=... WEBHOOK_SECRETO=... ZIP=... PDF=contrato.pdf yarn test:documentos
```

Hoy pasan 27 pruebas de validaciones y 30 de documentos. Si las corres seguidas, espera un minuto entre ellas: el límite es de 120 solicitudes por minuto por IP.

## Puesta en marcha del servidor (una vez)

Linode Ubuntu 24.04 con el Cloud Firewall abierto en 80/443 y el 22 solo desde la IP de administración. Los registros DNS `matchoncard.cl`, `www`, `admin` y `api` deben apuntar ya a la IP de la Linode.

Cada servicio explica sus certificados en su `CERTIFICADOS.md`:

| Servicio | Certificados |
|---|---|
| `api` | CA de la base de datos (`secrets/db-ca.crt`) y TLS de `api.matchoncard.cl` |
| `api-webhook` | Ninguno: no tiene dominio ni se conecta a la base |
| `api-signature` | CA propia y certificado de firma de PDF (`firma/`) |
| `app` | TLS de `matchoncard.cl` y `www.matchoncard.cl` |
| `app-admin` | TLS de `admin.matchoncard.cl` |

```bash
# 1) Docker, nginx y certbot
curl -fsSL https://get.docker.com | sh
apt-get install -y nginx certbot

# 2) Código
git clone <url-del-repo> /opt/matchoncard && cd /opt/matchoncard

# 3) Variables de producción (nunca en git). Sube los .env.production completos desde tu equipo:
#      scp api/.env.production root@<IP>:/opt/matchoncard/api/      (igual para api-webhook, api-signature, app y app-admin)
#    Claves nuevas: openssl rand -base64 32 (48 para SESSION_SECRET).
chmod 600 */.env.production
#    secrets/db-ca.crt → api/CERTIFICADOS.md · firma/ → api-signature/CERTIFICADOS.md

# 4) Imágenes, esquema, bucket y arranque
docker compose build
docker compose run --rm --no-deps api node /app/dist/scripts/migrar.js
#    CORS y ciclo de vida del bucket R2: en el panel de Cloudflare (api/CERTIFICADOS.md, sección 3)
docker compose up -d

# 5) nginx base (una vez): fragmentos comunes y sitio por defecto que responde los desafíos de Let's Encrypt
mkdir -p /var/www/certbot
cp nginx/conf.d/matchoncard.conf /etc/nginx/conf.d/
cp nginx/snippets/*.conf /etc/nginx/snippets/
cp nginx/sites-available/00-default.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/00-default.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
#    luego, el TLS de cada sitio: app/, app-admin/ y api/CERTIFICADOS.md (en cualquier orden)

# 6) Primer cliente de la API y primer superadmin (imprimen secretos UNA vez)
docker compose run --rm --no-deps api node /app/dist/scripts/crear-cliente.js portalfirma "Portalfirma" integracion,auditor,dpo
read -rsp "Clave: " C; echo; docker compose run --rm --no-deps -e ADMIN_CLAVE="$C" api node /app/dist/scripts/crear-admin.js admin; unset C
```

Después: guardar `KEK_BASE64` de `api/.env.production` en el gestor de contraseñas (sin ella la evidencia es irrecuperable), activar los Backups de Linode y probar `curl https://api.matchoncard.cl/health`. La API debería conectarse con un usuario propio de la base (no el administrador) y definir `DB_APP_USER` para que la migración deje la tabla `auditoria` sin `update`/`delete`.

## Despliegue de una versión nueva

```bash
cd /opt/matchoncard && git pull
docker compose build
docker compose run --rm --no-deps api node /app/dist/scripts/migrar.js   # si cambió el esquema
docker compose up -d
```

Si cambió algo en `nginx/`, copia el archivo a `/etc/nginx/...` y `nginx -t && systemctl reload nginx`. `git pull` no toca los `.env.production` (están fuera de git). **Nunca los borres** en el servidor, ni `secrets/` ni `firma/`.

Pendiente: actualización desde el panel (subir el paquete, con un código de despliegue aparte y vuelta atrás automática).

## Forma de trabajo

- Este repositorio es la **fuente de verdad**. Trabaja en una rama, abre un *pull request* y espera la aprobación de Jerónimo antes de juntar con `main`.
- Si el cambio toca el esquema, que `schema.sql` siga siendo idempotente (`create … if not exists`, `alter … add column if not exists`).
- Mantén los mensajes al usuario en español de Chile, claros y sin jerga técnica.

## Pendientes conocidos

- Actualización del sistema desde el panel.
- Fase 2: recálculo de los puntajes en el servidor (hoy el veredicto biométrico viene del teléfono).
- Huella: evaluar en terreno la variante "mano + 3 fotos" (`experimentos/huella-foto`), sobre todo con dedos que no son el pulgar derecho y con otras personas.
- Sello de tiempo (TSA) en las firmas (`TSA_URL` en el firmador).
- Certificado de firma reconocido (AATL) si se necesita que Adobe muestre la firma en verde.
