import { BLOQUEO_MIN, SESION_HORAS } from '../data/panel';

// acceso
export const ADMIN_POR_USUARIO = 'select * from admins where usuario = $1';
export const registrarIntentoFallido = (bloquear: boolean) =>
  `update admins set intentos_fallidos = $2, bloqueado_hasta = ${bloquear ? `now() + interval '${BLOQUEO_MIN} minutes'` : 'null'} where usuario = $1`;
export const INSERTAR_SESION = `insert into admin_sesiones (token_hash, usuario, ip, expira_en) values ($1, $2, $3, now() + interval '${SESION_HORAS} hours')`;
export const ADMIN_INGRESO_OK = 'update admins set intentos_fallidos = 0, bloqueado_hasta = null, ultimo_ingreso = now() where usuario = $1';
export const BORRAR_SESIONES_VENCIDAS = 'delete from admin_sesiones where expira_en < now()';
export const SESION_ACTIVA = `select s.usuario, a.rol from admin_sesiones s join admins a on a.usuario = s.usuario where s.token_hash = $1 and s.expira_en > now() and a.activo`;
export const BORRAR_SESION = 'delete from admin_sesiones where token_hash = $1';

// resumen y listado
export const RESUMEN_POR_ESTADO =
  `select estado, count(*)::int as n from validaciones where cliente_id = $1 and creado_en > now() - interval '30 days' group by estado`;
export const RESUMEN_POR_DIA =
  `select to_char(date_trunc('day', creado_en at time zone 'America/Santiago'), 'YYYY-MM-DD') as dia,
          count(*)::int as total, count(*) filter (where estado = 'aprobada')::int as aprobadas
     from validaciones where cliente_id = $1 and creado_en > now() - interval '30 days' group by 1 order by 1`;
// "where" se arma solo con marcadores $n (los valores van como parámetros)
export const contarValidaciones = (where: string) => `select count(*)::int as n from validaciones where ${where}`;
export const listarValidaciones = (where: string, tam: number, offset: number) =>
  `select * from validaciones where ${where} order by creado_en desc limit ${tam} offset ${offset}`;

// detalle
export const INFORMES_DE_VALIDACION =
  "select 'MOC-' || to_char(emitido_en, 'YYYY') || '-' || lpad(folio::text, 6, '0') as folio, sha256, emitido_por, emitido_en from informes where validacion_id = $1 order by emitido_en desc";
export const EXISTE_VALIDACION = 'select 1 from validaciones where id = $1 and cliente_id = $2';

// informes
export const SIGUIENTE_FOLIO = "select nextval('informes_folio_seq')::text as folio";
export const INSERTAR_INFORME = 'insert into informes (folio, validacion_id, sha256, bytes, emitido_por) values ($1,$2,$3,$4,$5)';
