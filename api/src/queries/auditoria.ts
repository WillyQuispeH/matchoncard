export const INSERTAR_AUDITORIA = 'insert into auditoria (validacion_id, actor, accion, ip, detalle) values ($1,$2,$3,$4,$5)';
export const HISTORIAL_VALIDACION = 'select en, actor, accion, ip, detalle from auditoria where validacion_id = $1 order by en';
