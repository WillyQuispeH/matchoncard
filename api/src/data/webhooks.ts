export const REPASO_MS = 30_000;            // repaso periódico: reintentos y webhooks que no salieron al encolar
export const RESERVA_SEGUNDOS = 120;        // mientras se envía, el webhook sale de la cola para que otro repaso no lo duplique
export const ESPERA_EMISOR_MS = 20_000;     // api-webhook espera hasta WEBHOOK_TIMEOUT_MS (10 s) al cliente
export const SIN_EMISOR_MINUTOS = 1;        // api-webhook no responde: vuelve a la cola sin gastar un intento
