// registro
export const INSERTAR_DOCUMENTO =
  `insert into documentos (id, cliente_id, nombre, referencia, url_confirmacion, url_retorno, orden, estado, dek_envuelta, objeto_clave, version, paginas, sha256_original, sha256_actual)
   values ($1,$2,$3,$4,$5,$6,$7,'pendiente',$8,$9,1,$10,$11,$12)`;
export const INSERTAR_VERSION_INICIAL = `insert into documento_versiones (documento_id, version, sha256, evento) values ($1,1,$2,'registrado')`;
export const INSERTAR_FIRMANTE =
  `insert into firmantes (id, documento_id, orden, nombre, rut_hash, rut_mascara, rut_cifrado, ubicaciones, campos, estado) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`;

// enlaces de los firmantes
export const FIRMANTE_CON_DOCUMENTO = 'select f.*, d.url_confirmacion, d.url_retorno, d.referencia, d.nombre as doc_nombre from firmantes f join documentos d on d.id = f.documento_id where f.id = $1';
export const ASIGNAR_VALIDACION = 'update firmantes set validacion_id = $2 where id = $1';
export const FIRMANTE_CON_VALIDACION = 'select f.*, v.estado as v_estado from firmantes f left join validaciones v on v.id = f.validacion_id where f.id = $1 and f.documento_id = $2';

// consulta
export const DOCUMENTO_DE_CLIENTE = 'select * from documentos where id = $1 and cliente_id = $2';
export const FIRMANTES_DE_DOCUMENTO =
  `select f.id, f.orden, f.nombre, f.rut_mascara, f.estado, f.ubicaciones, f.validacion_id, f.firmado_en, f.ultimo_error, v.estado as validacion_estado
   from firmantes f left join validaciones v on v.id = f.validacion_id where f.documento_id = $1 order by f.orden`;
export const LISTAR_DOCUMENTOS =
  `select d.id, d.nombre, d.referencia, d.estado, d.orden, d.version, d.creado_en, d.completado_en,
     count(f.*)::int as firmantes, count(f.*) filter (where f.estado = 'firmado')::int as firmados
   from documentos d left join firmantes f on f.documento_id = d.id where d.cliente_id = $1
   group by d.id order by d.creado_en desc limit $2`;

// cancelación y supresión
export const CANCELAR_DOCUMENTO = `update documentos set estado = 'cancelado', motivo_cancelacion = $2, actualizado_en = now() where id = $1`;
export const CANCELAR_FIRMANTES = `update firmantes set estado = 'cancelado' where documento_id = $1 and estado in ('en_espera','pendiente')`;
export const EXPIRAR_VALIDACIONES_DE_DOCUMENTO = `update validaciones set estado = 'expirada', actualizado_en = now() where firmante_id in (select id from firmantes where documento_id = $1) and estado = 'creada'`;
export const SUPRIMIR_DOCUMENTO = `update documentos set estado = case when estado = 'pendiente' then 'cancelado' else estado end, dek_envuelta = null, objeto_clave = null, actualizado_en = now() where id = $1`;
export const SUPRIMIR_FIRMANTES = `update firmantes set rut_cifrado = '', estado = case when estado in ('en_espera','pendiente','validado') then 'cancelado' else estado end where documento_id = $1`;

// firma tras la validación
export const VALIDACION_DE_FIRMANTE = 'select id, estado, firmante_id from validaciones where id = $1';
export const FIRMANTE_Y_ESTADO_DOCUMENTO = `select f.*, d.estado as doc_estado from firmantes f join documentos d on d.id = f.documento_id where f.id = $1`;
export const MARCAR_VALIDADO = `update firmantes set estado = 'validado', intentos_firma = 0, ultimo_error = null where id = $1 and estado = 'pendiente'`;
export const FIRMANTES_POR_FIRMAR = `select id from firmantes where estado = 'validado' and intentos_firma < $1 order by firmado_en nulls first limit 10`;
export const REGISTRAR_ERROR_FIRMA = 'update firmantes set intentos_firma = intentos_firma + 1, ultimo_error = $2 where id = $1';
export const FIRMANTE_POR_ID = `select * from firmantes where id = $1`;
export const BLOQUEAR_DOCUMENTO = `select * from documentos where id = $1 for update`;   // un firmante a la vez por documento
export const ESTADO_FIRMANTE = `select estado from firmantes where id = $1`;
export const VALIDACION_POR_ID = `select * from validaciones where id = $1`;
export const NUEVA_VERSION = `update documentos set version = $2, objeto_clave = $3, sha256_actual = $4, actualizado_en = now() where id = $1`;
export const INSERTAR_VERSION = `insert into documento_versiones (documento_id, version, sha256, evento) values ($1,$2,$3,$4)`;
export const MARCAR_FIRMADO = `update firmantes set estado = 'firmado', firmado_en = now(), ultimo_error = null where id = $1`;
export const FIRMANTES_RESTANTES = `select id, orden, estado from firmantes where documento_id = $1 and estado <> 'firmado' order by orden`;
export const COMPLETAR_DOCUMENTO = `update documentos set estado = 'completado', completado_en = now() where id = $1`;
export const ACTIVAR_FIRMANTE = `update firmantes set estado = 'pendiente' where id = $1`;

// verificación pública
export const VERSION_POR_HASH =
  `select d.id, d.estado, d.version as version_vigente, d.completado_en, dv.version, dv.creado_en as version_creada,
     (select count(*)::int from firmantes f where f.documento_id = d.id) as firmantes,
     (select count(*)::int from firmantes f where f.documento_id = d.id and f.estado = 'firmado') as firmados
   from documento_versiones dv join documentos d on d.id = dv.documento_id where dv.sha256 = $1 order by dv.version desc limit 1`;
