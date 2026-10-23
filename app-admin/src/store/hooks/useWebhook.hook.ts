import { useShallow } from 'zustand/react/shallow';
import { useWebhookStore } from '../zustand/webhook.store';

// mensaje del último error de una acción (para mostrarlo en el diálogo que la pidió)
const errorAccion = () => useWebhookStore.getState().estadoAccion.error;

export const useWebhook = () => ({
  errorAccion,
  ...useWebhookStore(useShallow((s) => ({
    lista: s.lista,
    filtro: s.filtro,
    detalle: s.detalle,
    estadoLista: s.estadoLista,
    estadoAccion: s.estadoAccion,
    webhookListar: s.webhookListar,
    webhookFiltrar: s.webhookFiltrar,
    webhookDetalle: s.webhookDetalle,
    webhookReintentar: s.webhookReintentar,
    webhookDescartar: s.webhookDescartar,
  }))),
});
