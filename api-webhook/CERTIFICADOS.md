# Certificados · api-webhook

`api-webhook` **no necesita ningún certificado**. No tiene dominio, no recibe tráfico de Internet y **no se conecta a la base de datos**: la API toma cada webhook de la cola, lo firma con HMAC y se lo pasa por la red interna de Docker (`POST /entregar`). Este servicio solo hace la llamada HTTP a la URL del cliente y le responde a la API si llegó. Los reintentos los lleva la API.

Por eso tampoco tiene la KEK ni la CA de la base: si alguien lograra abusar de él, no tendría acceso a datos ni a secretos.

## Paso a paso

**1. Revisar `api-webhook/.env.production`.** Solo lleva opcionales:

```bash
WEBHOOK_TIMEOUT_MS=10000               # espera máxima por la respuesta del cliente
```

**2. Arrancar y probar:**

```bash
docker compose up -d api-webhook
docker compose ps api-webhook          # healthy
docker compose logs --tail 20 api-webhook
```

En app-admin, la pantalla **Estado** debe mostrar `api-webhook · listo para entregar`.

## Y los webhooks que envía, ¿van cifrados?

Sí. Las URLs de los clientes deben ser `https://`; la API rechaza `http://` salvo con `ALLOW_HTTP_CALLBACKS=true`, que es solo para desarrollo. El certificado del cliente se valida con las CA públicas que trae Node, así que no hay nada que instalar. Cada entrega va firmada con HMAC (cabecera `X-V3P-Firma`), con el secreto de webhook del cliente; la firma la calcula la API.
