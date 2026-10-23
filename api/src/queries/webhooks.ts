// La API encola, firma y lleva los reintentos; api-webhook solo hace la llamada HTTP al cliente.
export const INSERTAR_WEBHOOK_VALIDACION = 'insert into webhooks (validacion_id, cliente_id, url, cuerpo) values ($1,$2,$3,$4) returning id';
export const INSERTAR_WEBHOOK_DOCUMENTO = 'insert into webhooks (documento_id, cliente_id, url, cuerpo) values ($1,$2,$3,$4) returning id';
export const DOCUMENTO_PARA_WEBHOOK = 'select id, cliente_id, callback_url, referencia, nombre, estado, sha256_actual, version from documentos where id = $1';
// toma un lote y lo aparta $3 segundos: otro repaso (u otra réplica de la API) no lo envía dos veces.
// Los descartados a mano desde app-admin no se reintentan.
export const RESERVAR_PENDIENTES =
  `update webhooks w set proximo_en = now() + ($3 || ' seconds')::interval from clientes c
   where c.id = w.cliente_id and w.id in (
     select id from webhooks where entregado_en is null and descartado_en is null and intentos < $1 and proximo_en <= now()
     order by proximo_en limit $2 for update skip locked)
   returning w.id, w.url, w.cuerpo, w.intentos, c.webhook_secreto_cifrado`;
export const MARCAR_ENTREGADO = 'update webhooks set entregado_en = now(), intentos = intentos + 1, ultimo_error = null where id = $1';
// espera creciente: 1, 2, 4, 8… minutos
export const REPROGRAMAR = `update webhooks set intentos = $2, ultimo_error = $3, proximo_en = now() + ($4 || ' minutes')::interval where id = $1`;
// api-webhook no respondió: no es culpa del cliente, así que no cuenta como intento
export const DEVOLVER_A_COLA = `update webhooks set ultimo_error = $2, proximo_en = now() + ($3 || ' minutes')::interval where id = $1`;
