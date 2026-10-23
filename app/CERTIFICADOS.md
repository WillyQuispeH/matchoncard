# Certificados · app (matchoncard.cl)

`app` (contenedor en `127.0.0.1:4561`) sirve la landing, `/demo` y `/verificar`. Necesita **un certificado TLS** de Let's Encrypt para `matchoncard.cl` y `www.matchoncard.cl`. El certificado lo usa nginx en el servidor, no el contenedor.

| Qué | Dónde queda |
|---|---|
| Certificado y clave | `/etc/letsencrypt/live/matchoncard.cl/` |
| Sitio de nginx | `nginx/sites-available/matchoncard.cl.conf` → `/etc/nginx/sites-available/` |

## Antes de empezar

- Los registros DNS A de `matchoncard.cl` y `www.matchoncard.cl` apuntan a la IP de la Linode.
- El Cloud Firewall deja entrar el 80 y el 443.
- Ya hiciste el paso "nginx base" de `DESARROLLO.md` (sección "Puesta en marcha del servidor", paso 5): existe `/var/www/certbot` y está activo `00-default.conf`.
- El contenedor `app` está arriba: `docker compose ps app` debe decir `healthy`.

Todos los comandos van como root, desde la carpeta del proyecto (`cd /opt/matchoncard`).

## Paso a paso

**1. Comprobar el DNS.** Las dos líneas deben mostrar la IP de la Linode:

```bash
dig +short matchoncard.cl
dig +short www.matchoncard.cl
```

**2. Pedir el certificado.** Un solo certificado cubre los dos nombres:

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d matchoncard.cl -d www.matchoncard.cl \
  -m <tu-correo> --agree-tos -n \
  --deploy-hook "systemctl reload nginx"
```

Debe terminar con `Successfully received certificate`. El correo sirve para los avisos de vencimiento de Let's Encrypt.

**3. Activar el sitio en nginx:**

```bash
cp nginx/sites-available/matchoncard.cl.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/matchoncard.cl.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

**4. Probar:**

```bash
curl -I https://matchoncard.cl                 # 200
curl -I https://www.matchoncard.cl             # 301 → https://matchoncard.cl/
curl -I http://matchoncard.cl                  # 301 → https://
certbot certificates -d matchoncard.cl         # dominios y fecha de vencimiento
```

## Renovación

Es automática. El paquete `certbot` instala un temporizador (`certbot.timer`) que renueva cuando faltan menos de 30 días, y el `--deploy-hook` recarga nginx. Para probarla sin renovar de verdad:

```bash
systemctl list-timers certbot.timer
certbot renew --dry-run
```

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `certbot` dice `Timeout during connect` o `Connection refused` | El DNS no apunta a la Linode, o el Cloud Firewall o `ufw` bloquean el puerto 80 |
| `certbot` dice `404` en `/.well-known/acme-challenge/` | Falta `/var/www/certbot` o `00-default.conf` no está activo |
| `nginx -t` dice `cannot load certificate` | El paso 2 no terminó bien: no existe `/etc/letsencrypt/live/matchoncard.cl/` |
| `502 Bad Gateway` | El contenedor `app` no está arriba: `docker compose ps app` y `docker compose logs app` |
