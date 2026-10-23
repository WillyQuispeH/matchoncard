// Consultas de app-admin: clientes, usuarios, webhooks, auditoría y estado.

// ── clientes ──
export const LISTAR_CLIENTES =
  `select c.id, c.nombre, c.roles, c.activo, c.creado_en,
     (select count(*)::int from validaciones v where v.cliente_id = c.id and v.creado_en > now() - interval '30 days') as validaciones_30d,
     (select count(*)::int from documentos d where d.cliente_id = c.id and d.creado_en > now() - interval '30 days') as documentos_30d,
     (select count(*)::int from webhooks w where w.cliente_id = c.id and w.entregado_en is null and w.descartado_en is null and w.intentos >= $1) as webhooks_fallidos
   from clientes c order by c.creado_en`;
export const CLIENTE_ADMIN = 'select id, nombre, roles, activo, creado_en from clientes where id = $1';
export const INSERTAR_CLIENTE =
  'insert into clientes (id, nombre, secreto_cifrado, webhook_secreto_cifrado, roles) values ($1,$2,$3,$4,$5) on conflict (id) do nothing returning id';
export const ACTUALIZAR_CLIENTE =
  'update clientes set nombre = coalesce($2, nombre), roles = coalesce($3, roles), activo = coalesce($4, activo) where id = $1 returning id, nombre, roles, activo, creado_en';
export const ROTAR_SECRETO_JWT = 'update clientes set secreto_cifrado = $2 where id = $1';
export const ROTAR_SECRETO_WEBHOOK = 'update clientes set webhook_secreto_cifrado = $2 where id = $1';

// ── usuarios del panel ──
export const LISTAR_ADMINS =
  `select a.usuario, a.rol, a.activo, a.intentos_fallidos, a.bloqueado_hasta, a.ultimo_ingreso, a.creado_en,
     (select count(*)::int from admin_sesiones s where s.usuario = a.usuario and s.expira_en > now()) as sesiones_abiertas
   from admins a order by a.creado_en`;
export const ADMIN = 'select usuario, rol, activo from admins where usuario = $1';
export const INSERTAR_ADMIN = 'insert into admins (usuario, clave_hash, rol) values ($1,$2,$3) on conflict (usuario) do nothing returning usuario';
export const ACTUALIZAR_ADMIN = 'update admins set rol = coalesce($2, rol), activo = coalesce($3, activo) where usuario = $1';
export const CAMBIAR_CLAVE_ADMIN = 'update admins set clave_hash = $2, intentos_fallidos = 0, bloqueado_hasta = null where usuario = $1';
export const DESBLOQUEAR_ADMIN = 'update admins set intentos_fallidos = 0, bloqueado_hasta = null where usuario = $1';
export const CERRAR_SESIONES_ADMIN = 'delete from admin_sesiones where usuario = $1';
export const CONTAR_SUPERADMINS_ACTIVOS = `select count(*)::int as n from admins where rol = 'superadmin' and activo`;

// ── webhooks ──
// estado: pendiente (aún se reintenta) | fallido (agotó los intentos) | entregado | descartado
export const ESTADO_WEBHOOK =
  `case when w.entregado_en is not null then 'entregado' when w.descartado_en is not null then 'descartado'
        when w.intentos >= $1 then 'fallido' else 'pendiente' end`;
export const listarWebhooks = (where: string, tam: number, offset: number) =>
  `select w.id, w.validacion_id, w.documento_id, w.cliente_id, w.url, w.cuerpo->>'evento' as evento, w.intentos, w.proximo_en,
          w.entregado_en, w.ultimo_error, w.descartado_en, w.descartado_por, ${ESTADO_WEBHOOK} as estado
     from webhooks w where ${where} order by w.id desc limit ${tam} offset ${offset}`;
export const contarWebhooks = (where: string) => `select count(*)::int as n from webhooks w where ${where}`;
export const RESUMEN_WEBHOOKS =
  `select ${ESTADO_WEBHOOK} as estado, count(*)::int as n from webhooks w group by 1`;
export const WEBHOOK = `select w.*, ${ESTADO_WEBHOOK} as estado from webhooks w where w.id = $2`;
// reintentar: vuelve a la cola de inmediato con los intentos en cero
export const REINTENTAR_WEBHOOK = `update webhooks set intentos = 0, proximo_en = now(), ultimo_error = null where id = $1 and entregado_en is null and descartado_en is null`;
export const DESCARTAR_WEBHOOK = `update webhooks set descartado_en = now(), descartado_por = $2 where id = $1 and entregado_en is null and descartado_en is null`;
// ── auditoría ──
export const listarAuditoria = (where: string, tam: number, offset: number) =>
  `select id, en, validacion_id, actor, accion, ip, detalle from auditoria where ${where} order by en desc, id desc limit ${tam} offset ${offset}`;
export const ACCIONES_AUDITORIA = `select distinct accion from auditoria where en > now() - interval '180 days' order by 1`;

// ── estado ──
export const ESTADO_BASE = `select now() as ahora, current_setting('server_version') as version, pg_database_size(current_database())::bigint as bytes`;
