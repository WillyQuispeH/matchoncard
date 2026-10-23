# Certificados · app-admin (admin.matchoncard.cl)

`app-admin` (contenedor en `127.0.0.1:4564`) es la administración: clientes, usuarios, validaciones, documentos, webhooks y auditoría. Necesita **un certificado TLS** de Let's Encrypt para `admin.matchoncard.cl`. El certificado lo usa nginx en el servidor, no el contenedor.

| Qué | Dónde queda |
|---|---|
| Certificado y clave | `/etc/letsencrypt/live/admin.matchoncard.cl/` |
| Sitio de nginx | `nginx/sites-available/admin.matchoncard.cl.conf` → `/etc/nginx/sites-available/` |

## Antes de empezar

- El registro DNS A de `admin.matchoncard.cl` apunta a la IP de la Linode.
- El Cloud Firewall deja entrar el 80 y el 443.
- Ya hiciste el paso "nginx base" de `DESARROLLO.md` (sección "Puesta en marcha del servidor", paso 5): existe `/var/www/certbot` y está activo `00-default.conf`.
- El contenedor `app-admin` está arriba: `docker compose ps app-admin` debe decir `healthy`.

Todos los comandos van como root, desde la carpeta del proyecto (`cd /opt/matchoncard`).

## Paso a paso

**1. Comprobar el DNS.** Debe mostrar la IP de la Linode:

```bash
dig +short admin.matchoncard.cl
```

**2. Pedir el certificado:**

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d admin.matchoncard.cl \
  -m <tu-correo> --agree-tos -n \
  --deploy-hook "systemctl reload nginx"
```

Debe terminar con `Successfully received certificate`.

**3. (Recomendado) Limitar el acceso por IP.** En `nginx/sites-available/admin.matchoncard.cl.conf`, descomenta y ajusta estas líneas del bloque `443`. No afectan la renovación del certificado, que va por el puerto 80:

```nginx
allow 200.1.2.3;     # IP fija de la oficina o de la VPN (una línea por IP)
deny all;
```

**4. Activar el sitio en nginx:**

```bash
cp nginx/sites-available/admin.matchoncard.cl.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/admin.matchoncard.cl.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

**5. Probar:**

```bash
curl -I https://admin.matchoncard.cl                 # 200 o redirección al login (403 si limitaste por IP y no estás en la lista)
curl -I http://admin.matchoncard.cl                  # 301 → https://
certbot certificates -d admin.matchoncard.cl         # fecha de vencimiento
```

Para entrar necesitas un usuario. El primer superadmin se crea con `crear-admin.js` (ver `DESARROLLO.md`, paso 6).

## Renovación

Es automática: `certbot.timer` renueva cuando faltan menos de 30 días y el `--deploy-hook` recarga nginx. Para probarla:

```bash
certbot renew --dry-run
```

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `certbot` dice `Timeout during connect` o `Connection refused` | El DNS no apunta a la Linode, o el Cloud Firewall o `ufw` bloquean el puerto 80 |
| `certbot` dice `404` en `/.well-known/acme-challenge/` | Falta `/var/www/certbot` o `00-default.conf` no está activo |
| `nginx -t` dice `cannot load certificate` | El paso 2 no terminó bien |
| `403 Forbidden` | Activaste `allow`/`deny` y tu IP no está en la lista |
| `502 Bad Gateway` | El contenedor `app-admin` no está arriba: `docker compose logs app-admin` |
