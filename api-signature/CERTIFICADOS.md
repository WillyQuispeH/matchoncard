# Certificados · api-signature (firma de PDF)

`api-signature` **no tiene dominio ni certificado TLS**, y no debe tenerlo nunca. Vive en la red `interna` de Docker, sin entrada ni salida a Internet, y solo la API lo alcanza. Firma cualquier PDF que le llegue sin pedir autenticación. Si se publicara, cualquiera podría firmar documentos a nombre de MatchOnCard.

Lo que sí necesita es el **certificado con que firma los PDF**, emitido por una CA propia:

| Archivo | Qué es | Dónde queda | ¿Secreto? |
|---|---|---|---|
| `firma/firma.p12` | Clave privada + certificado "MatchOnCard Firma Electrónica Simple" (vence a los **3 años**) | Servidor | **Sí** |
| `firma/firma-ca.pem` | Certificado público de la CA "MatchOnCard CA Raíz" (vence a los **15 años**). Se usa para verificar las firmas | Servidor | No |
| `api-signature/.env.production` | `FIRMA_P12_CLAVE`: la clave que protege `firma.p12` | Servidor + gestor de contraseñas | **Sí** |
| `firma-ca.key.p12` | Clave privada de la CA. Solo hace falta para emitir certificados nuevos | **Fuera del servidor** (gestor de contraseñas o bóveda) | **Sí, el más delicado** |

Ninguno va a git (`.gitignore` excluye `firma/`, `*.p12`, `*.pem`, `*.key`, `.env` y `.env.*`).

**Si vienes del servidor anterior**, no crees un certificado nuevo: copia su `firma/` a la carpeta del proyecto y pon su clave (la de su `firma.env`) en `FIRMA_P12_CLAVE` de `api-signature/.env.production`. Así los PDF ya firmados se siguen verificando. Luego salta al paso 5.

Todos los comandos van como root, desde la carpeta del proyecto (`cd /opt/matchoncard`).

## Crear el certificado (una vez)

**1. Requisito.** Deben existir los `.env.production` de todos los servicios (`api`, `api-webhook`, `api-signature`, `app` y `app-admin`), porque Docker Compose los lee aunque solo se construya este servicio. En `api-signature/.env.production` puedes dejar `FIRMA_P12_CLAVE=` vacío.

**2. Ejecutar el script:**

```bash
bash deploy/crear-firma.sh
```

El script:
- si `FIRMA_P12_CLAVE` está vacía, genera una clave aleatoria y la guarda en `api-signature/.env.production` (permisos 600). No necesitas escribirla ni recordarla;
- construye la imagen y, dentro del contenedor, ejecuta `crear_certificado.py`, que crea la CA y el certificado de firma;
- deja `firma/firma.p12` y `firma/firma-ca.pem` con dueño `10001` (el usuario del contenedor) y permisos 750;
- deja la clave de la CA en `firma-ca-respaldo/firma-ca.key.p12`.

Si `firma/firma.p12` ya existe, no hace nada. Nunca sobrescribe un certificado.

**3. Respaldar**, desde tu computador. El script imprime los comandos exactos:

```bash
scp root@<IP>:/opt/matchoncard/firma-ca-respaldo/firma-ca.key.p12 ~/Documents/
scp root@<IP>:/opt/matchoncard/api-signature/.env.production ~/Documents/matchoncard-firma.env
```

Guarda los dos archivos en el gestor de contraseñas de la empresa: la clave de la CA está protegida con la clave que va en ese `.env`. Luego bórralos del computador.

**4. Borrar la clave de la CA del servidor.** Si alguien entra al servidor, no debe poder emitir certificados:

```bash
rm -rf firma-ca-respaldo
```

**5. Arrancar y probar:**

```bash
docker compose up -d api-signature
docker compose ps api-signature                                              # healthy
docker compose exec api-signature wget -qO- http://127.0.0.1:4563/salud      # {"ok":true,"certificado":"...","vence":"..."}
```

La pantalla **Estado** de `app-admin` también muestra la fecha de vencimiento del certificado.

## Renovar el certificado de firma (antes de los 3 años)

Hoy `crear_certificado.py` crea siempre una CA nueva junto con el certificado. Para que los PDF firmados antes se sigan verificando en `matchoncard.cl/verificar`, hay que conservar la CA anterior en `firma-ca.pem`. El firmador acepta varias CA en ese archivo.

```bash
docker compose stop api-signature
mv firma firma-anterior
bash deploy/crear-firma.sh                                  # reutiliza la clave de api-signature/.env.production
cat firma-anterior/firma-ca.pem >> firma/firma-ca.pem       # confía en la CA nueva y en la anterior
chown -R 10001:10001 firma
docker compose up -d api-signature
```

Después repite los pasos 3 y 4 (respaldo de la nueva clave de la CA y borrado del servidor). Guarda `firma-anterior/` fuera del servidor y bórrala de ahí.

## Desarrollo local

En tu equipo no se usa `deploy/crear-firma.sh`. Se crea un certificado **de prueba** en `./tmp-firma`:

```bash
cd api-signature
yarn setup              # dependencias de Python
yarn certificado        # usa FIRMA_P12_CLAVE de api-signature/.env (mínimo 16 caracteres)
```

`api-signature/.env` (el local) ya apunta a esos archivos con `FIRMA_P12_PATH=./tmp-firma/firma.p12` y `FIRMA_CA_PATH=./tmp-firma/firma-ca.pem`. Nunca uses un certificado de prueba en producción ni el de producción en tu equipo.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `crear-firma.sh` dice `env file ... not found` | Falta algún `.env.production` (requisito del paso 1) |
| `/salud` falla con `No se pudo cargar el certificado de firma` | `FIRMA_P12_CLAVE` no corresponde a `firma.p12`, o `firma/` no es del usuario `10001` |
| `/verificar` dice "identidad desconocida" en PDF antiguos | Se renovó sin agregar la CA anterior a `firma/firma-ca.pem` |
| Adobe muestra la firma en amarillo ("identidad desconocida") | Es lo esperado con una CA propia. Para verde hace falta un certificado de una entidad reconocida (lista AATL) |
