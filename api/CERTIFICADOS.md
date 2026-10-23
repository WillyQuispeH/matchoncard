# Certificados · api (api.matchoncard.cl)

La API necesita dos certificados:

| Certificado | Para qué | Dónde queda |
|---|---|---|
| **CA de la base de datos** | Conectarse a la Managed PostgreSQL por TLS, comprobando que el servidor es el de Linode | `secrets/db-ca.crt` (en la carpeta del proyecto, fuera de git) |
| **TLS de `api.matchoncard.cl`** | Que Portalfirma y los teléfonos de los firmantes lleguen por HTTPS | `/etc/letsencrypt/live/api.matchoncard.cl/` |

`api.matchoncard.cl` apunta en nginx a la API (`127.0.0.1:4560`). La excepción es la página de captura (`/captura/<token>`), que es de Next y va al contenedor `app` (`127.0.0.1:4561`). El puerto 4560 solo escucha en `127.0.0.1`: desde Internet se llega únicamente a través de nginx.

Todos los comandos van como root, desde la carpeta del proyecto (`cd /opt/matchoncard`).

---

## 1. CA de la base de datos (`secrets/db-ca.crt`)

Solo la usa `api`, que es el único servicio conectado a la base (`api-webhook` recibe los webhooks ya firmados desde la API). El compose monta `./secrets` en `/run/secrets` (solo lectura) y `DATABASE_CA_PATH=/run/secrets/db-ca.crt` le dice a la API dónde está.

**1.1 Descargarla.** En Linode Cloud Manager: **Databases** → tu clúster → **Summary** → **Download CA Certificate**. Baja un archivo `.crt`.

**1.2 Subirla al servidor**, desde tu computador:

```bash
scp ~/Downloads/<archivo-descargado>.crt root@<IP-de-la-Linode>:/opt/matchoncard/db-ca.crt
```

**1.3 Dejarla en su lugar**, en el servidor. El certificado de la CA es público; lo que importa es que lo pueda leer el usuario sin privilegios de los contenedores:

```bash
mkdir -p secrets && chmod 755 secrets
mv db-ca.crt secrets/db-ca.crt && chmod 644 secrets/db-ca.crt
openssl x509 -in secrets/db-ca.crt -noout -subject -enddate     # debe mostrar el emisor y la fecha de vencimiento
```

**1.4 Revisar `api/.env.production`:**

```bash
DATABASE_SSL=true
DATABASE_CA_PATH=/run/secrets/db-ca.crt
DB_HOST=<host-privado>   # usa el "Private Host" del clúster
DB_PORT=<puerto>
DB_USER=<usuario>
DB_PASSWORD=<clave>
DB_NAME=<base>
```

**1.5 Probar la conexión.** La migración es idempotente, así que sirve de prueba:

```bash
docker compose run --rm --no-deps api node /app/dist/scripts/migrar.js
```

Si dice `self-signed certificate in certificate chain` o `unable to get local issuer certificate`, el archivo no es el de tu clúster o la ruta está mal.

**Si Linode cambia la CA** (poco frecuente): repite 1.1 a 1.3 y reinicia la API:

```bash
docker compose restart api
```

---

## 2. TLS de `api.matchoncard.cl`

### Antes de empezar

- El registro DNS A de `api.matchoncard.cl` apunta a la IP de la Linode.
- El Cloud Firewall deja entrar el 80 y el 443.
- Ya hiciste el paso "nginx base" de `DESARROLLO.md` (sección "Puesta en marcha del servidor", paso 5).
- `PUBLIC_URL=https://api.matchoncard.cl` en `api/.env.production`. Con ella se arman los links de captura y se configura el CORS del bucket.

**2.1 Comprobar el DNS:**

```bash
dig +short api.matchoncard.cl
```

**2.2 Pedir el certificado:**

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d api.matchoncard.cl \
  -m <tu-correo> --agree-tos -n \
  --deploy-hook "systemctl reload nginx"
```

**2.3 Activar el sitio en nginx:**

```bash
cp nginx/sites-available/api.matchoncard.cl.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/api.matchoncard.cl.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

**2.4 Probar:**

```bash
curl https://api.matchoncard.cl/health          # {"ok":true,...}: la API y la base responden
curl -I https://api.matchoncard.cl/             # 302 → https://matchoncard.cl/
certbot certificates -d api.matchoncard.cl      # fecha de vencimiento
```

**2.5 Si cambiaste el dominio** (o es la primera vez), configura el CORS del bucket de R2 para que el teléfono pueda subir la evidencia. Ver la sección 3.

### Renovación

Es automática (`certbot.timer` y el `--deploy-hook`). Para probarla:

```bash
certbot renew --dry-run
```

### Si algo falla

| Síntoma | Causa probable |
|---|---|
| `certbot` dice `Timeout during connect` | El DNS no apunta a la Linode o el puerto 80 está cerrado |
| `/health` responde `502` | `app` o `api` no están arriba: `docker compose ps` y `docker compose logs api` |
| El teléfono no puede subir la evidencia (error de CORS) | `PUBLIC_URL` no coincide con el dominio, o falta el CORS del bucket (sección 3) |

---

## 3. Bucket de R2 (CORS y ciclo de vida)

No es un certificado, pero sin esto la captura no funciona: el teléfono sube la evidencia cifrada **directo a R2** con una URL firmada, así que el bucket debe aceptar `PUT` desde el dominio de captura.

El token de R2 de `api/.env.production` es de **objetos** (leer y escribir), así que `configurar-bucket.js` no puede cambiar la configuración del bucket: responde `AccessDenied`. Hazlo en el panel de Cloudflare: **R2** → bucket `matchoncard` → **Settings**.

**3.1 CORS Policy** → **Edit** → pega:

```json
[
  {
    "AllowedOrigins": ["https://api.matchoncard.cl"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Si desarrollas en local contra el mismo bucket, agrega también `"http://127.0.0.1:4561"` a `AllowedOrigins`.

**3.2 Object lifecycle rules** → **Add rule**. Es una red de seguridad: la API borra a tiempo, esto atrapa lo que se escape.

| Regla | Prefijo | Acción |
|---|---|---|
| `retencion-maxima` | `evidencia/` | Borrar objetos a los **1855 días** (`RETENTION_DAYS_APPROVED` + 30) |
| `subidas-incompletas` | `evidencia/` | Abortar subidas multiparte incompletas a **1 día** |

**3.3 Public access** → **R2.dev subdomain**: déjalo **desactivado** (Disallow Access). La evidencia y los PDF nunca se sirven públicamente; la API los lee con sus credenciales. `R2_DOMAIN` está en el `.env` solo como referencia.

Alternativa al panel: crea un token de R2 con permiso **Admin Read & Write**, ponlo temporalmente en `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`, corre `docker compose run --rm --no-deps api node /app/dist/scripts/configurar-bucket.js`, vuelve a poner el token de objetos y borra el de administración.
