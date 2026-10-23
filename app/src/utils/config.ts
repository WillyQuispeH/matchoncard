// Único punto que lee process.env (regla de la guía).
// Ninguna variable de aquí es secreta ni lleva NEXT_PUBLIC_: el navegador habla siempre con su mismo origen.

export const config = {
  // URL interna de la API (red de Docker). Solo la usan los Route Handlers que hacen de proxy, en el servidor.
  apiInterna: (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4560').replace(/\/$/, ''),
  // rutas que el navegador llama en el mismo origen
  rutas: {
    verificar: '/verificar/api',
  },
  // límite que se valida antes de subir (la API lo vuelve a validar)
  maxPdfBytes: 25 * 1024 * 1024,
};
