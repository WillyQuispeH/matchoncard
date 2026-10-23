export const VALIDACION_POR_TOKEN = 'select * from validaciones where token_hash = $1';
export const INICIAR_SESION = `update validaciones set estado = 'en_captura', sesion_iniciada_en = now(), sesion_expira = $2, actualizado_en = now() where id = $1`;
export const GUARDAR_CONSENTIMIENTO = `update validaciones set estado = 'consentida', consentimiento = $2, actualizado_en = now() where id = $1`;
export const GUARDAR_OBJETO = 'update validaciones set objeto_clave = $2, actualizado_en = now() where id = $1';
export const GUARDAR_RESULTADO =
  `update validaciones set estado = $2, resultado = $3, veredicto_cliente = $4, evidencia_sha256 = $5, evidencia_bytes = $6, evidencia_subida_en = now(),
     integridad = $7, motivos = $8, retener_hasta = now() + ($9 || ' days')::interval, actualizado_en = now() where id = $1`;
