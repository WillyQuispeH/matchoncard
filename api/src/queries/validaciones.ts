export const INSERTAR_VALIDACION =
  `insert into validaciones (id, cliente_id, rut_hash, rut_mascara, nombre, documento_id, referencia, url_confirmacion, url_retorno, estado, token_hash, link_expira, dek_envuelta, firmante_id)
   values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'creada',$10,$11,$12,$13)`;
export const VALIDACION_DE_CLIENTE = 'select * from validaciones where id = $1 and cliente_id = $2';
export const VALIDACION_POR_ID = 'select * from validaciones where id = $1';
export const VALIDACIONES_POR_RUT = 'select * from validaciones where cliente_id = $1 and rut_hash = $2 order by creado_en desc limit 200';
// supresión: se conservan solo el id, estado, hash y fechas
export const SUPRIMIR_VALIDACION =
  `update validaciones set estado = $2, dek_envuelta = null, nombre = null, rut_mascara = null, token_hash = null,
     consentimiento = case when consentimiento is null then null else jsonb_build_object('version', consentimiento->'version', 'otorgado_en', consentimiento->'otorgado_en') end,
     resultado = case when resultado is null then null else jsonb_build_object('global', resultado->'global', 'nivel', resultado->'nivel') end,
     actualizado_en = now() where id = $1`;
export const EXPIRAR_VALIDACION = `update validaciones set estado = 'expirada', actualizado_en = now() where id = $1`;

// tareas de retención
export const VALIDACIONES_ABANDONADAS =
  `select * from validaciones where estado in ('creada','en_captura','consentida')
     and ((sesion_expira is null and link_expira < now()) or sesion_expira < now()) limit 200`;
export const VALIDACIONES_RETENCION_VENCIDA = `select * from validaciones where estado not in ('borrada','expirada') and retener_hasta < now() limit 200`;
