import dotenv from 'dotenv';

// .env del servicio (en Docker las variables llegan por env_file y dotenv no las pisa)
dotenv.config();

const num = (name: string, def: number) => (process.env[name] ? Number(process.env[name]) : def);

// Sin base de datos ni KEK: la API arma, firma y reintenta; este servicio solo hace la llamada al cliente.
export const config = {
  puerto: num('PORT', 4562),
  timeoutMs: num('WEBHOOK_TIMEOUT_MS', 10_000),
};
export type Config = typeof config;
