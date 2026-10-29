-- Esquema de la API Validación en 3 Pasos. Idempotente: se puede ejecutar varias veces.
-- Regla: la base guarda resultados, hashes y metadatos. Nunca imágenes ni plantillas biométricas.

create table if not exists clientes (
  id                     text primary key,              -- valor de la cabecera "id"
  nombre                 text not null,
  secreto_cifrado        text not null,                 -- secreto HS256 del JWT, envuelto con la KEK
  webhook_secreto_cifrado text not null,                -- secreto HMAC de los webhooks, envuelto con la KEK
  roles                  text[] not null default '{integracion}',
  activo                 boolean not null default true,
  creado_en              timestamptz not null default now()
);

create table if not exists validaciones (
  id                     uuid primary key,
  cliente_id             text not null references clientes(id),
  rut_hash               text not null,                 -- HMAC(pimienta, RUT normalizado)
  rut_mascara            text,                          -- ej. ****678-9 (para mostrar)
  nombre                 text,
  documento_id           text,
  referencia             text,
  url_confirmacion       text,                          -- webhook entre servidores (POST firmado con HMAC)
  url_retorno            text,                          -- a dónde vuelve el firmante al terminar
  estado                 text not null,                 -- creada | en_captura | consentida | evidencia_subida | aprobada | rechazada | revision | expirada | borrada
  token_hash             text unique,                   -- sha256 del token del link (el token no se guarda)
  link_expira            timestamptz not null,
  sesion_iniciada_en     timestamptz,
  sesion_expira          timestamptz,
  dek_envuelta           text,                          -- clave AES-256 de la evidencia, envuelta con la KEK; null = destruida
  objeto_clave           text,                          -- ruta del objeto en el bucket
  evidencia_bytes        bigint,
  evidencia_sha256       text,                          -- sha256 del ZIP original (antes de cifrar)
  evidencia_subida_en    timestamptz,
  integridad             text not null default 'pendiente', -- pendiente | ok | distinta | sin_evidencia
  consentimiento         jsonb,
  resultado              jsonb,                         -- resumen enviado por el teléfono (puntajes, veredictos, motor)
  veredicto_cliente      text,
  motivos                text[] not null default '{}',
  verificacion_servidor  text not null default 'pendiente', -- fase 2: re-cálculo de puntajes en servidor
  retener_hasta          timestamptz,
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now()
);
create index if not exists validaciones_rut_idx on validaciones (rut_hash);
create index if not exists validaciones_retencion_idx on validaciones (retener_hasta) where estado <> 'borrada';
create index if not exists validaciones_cliente_idx on validaciones (cliente_id, creado_en desc);

-- Registro de auditoría: solo inserción. En producción el usuario de la app no debe tener UPDATE/DELETE sobre esta tabla.
create table if not exists auditoria (
  id             bigserial primary key,
  en             timestamptz not null default now(),
  validacion_id  uuid,
  actor          text not null,        -- cliente:<id> | telefono | sistema
  accion         text not null,
  ip             text,
  detalle        jsonb
);
create index if not exists auditoria_validacion_idx on auditoria (validacion_id, en);

create table if not exists webhooks (
  id             bigserial primary key,
  validacion_id  uuid not null,
  cliente_id     text not null,
  url            text not null,
  cuerpo         jsonb not null,
  intentos       int not null default 0,
  proximo_en     timestamptz not null default now(),
  entregado_en   timestamptz,
  ultimo_error   text
);
create index if not exists webhooks_pendientes_idx on webhooks (proximo_en) where entregado_en is null;

-- Panel de administración
create table if not exists admins (
  usuario            text primary key,
  clave_hash         text not null,                 -- scrypt$N$r$p$salt$hash
  activo             boolean not null default true,
  intentos_fallidos  int not null default 0,
  bloqueado_hasta    timestamptz,
  ultimo_ingreso     timestamptz,
  creado_en          timestamptz not null default now()
);
create table if not exists admin_sesiones (
  token_hash   text primary key,                    -- sha256 del token de la cookie
  usuario      text not null references admins(usuario) on delete cascade,
  ip           text,
  creada_en    timestamptz not null default now(),
  expira_en    timestamptz not null
);
create index if not exists admin_sesiones_expira_idx on admin_sesiones (expira_en);

-- Informes emitidos (folio correlativo + hash del PDF)
create sequence if not exists informes_folio_seq;
create table if not exists informes (
  folio          bigint primary key default nextval('informes_folio_seq'),
  validacion_id  uuid not null,
  sha256         text not null,
  bytes          int not null,
  emitido_por    text not null,
  emitido_en     timestamptz not null default now()
);
create index if not exists informes_validacion_idx on informes (validacion_id);

-- ===================== Firma electrónica de documentos =====================
-- El PDF se guarda CIFRADO en el bucket (AES-256-GCM con una DEK por documento, envuelta con la KEK).
-- Cada firma genera una versión nueva (incremental); se guarda el hash de todas para poder verificarlas.
create table if not exists documentos (
  id               uuid primary key,
  cliente_id       text not null references clientes(id),
  nombre           text not null,
  referencia       text,
  url_confirmacion text,                             -- webhook entre servidores (POST firmado con HMAC)
  url_retorno      text,                             -- a dónde vuelve cada firmante al terminar
  orden            text not null default 'libre',    -- libre | secuencial
  estado           text not null,                    -- pendiente | completado | cancelado
  dek_envuelta     text,
  objeto_clave     text,                             -- versión vigente en el bucket
  version          int not null default 0,
  paginas          int not null,
  sha256_original  text not null,                    -- PDF que entregó el cliente
  sha256_actual    text not null,                    -- versión vigente (con sello y firmas)
  motivo_cancelacion text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  completado_en    timestamptz
);
create index if not exists documentos_cliente_idx on documentos (cliente_id, creado_en desc);

create table if not exists documento_versiones (
  documento_id  uuid not null references documentos(id),
  version       int not null,
  sha256        text not null,
  evento        text not null,                       -- registrado | firmado:<firmante>
  creado_en     timestamptz not null default now(),
  primary key (documento_id, version)
);
create index if not exists documento_versiones_sha_idx on documento_versiones (sha256);

create table if not exists firmantes (
  id             uuid primary key,
  documento_id   uuid not null references documentos(id),
  orden          int not null,
  nombre         text not null,
  rut_hash       text not null,
  rut_mascara    text not null,
  rut_cifrado    text not null,                      -- para la estampa visible; envuelto con la KEK
  ubicaciones    jsonb not null,
  campos         text[] not null,
  estado         text not null,                      -- en_espera | pendiente | validado | firmado | cancelado
  validacion_id  uuid,
  intentos_firma int not null default 0,
  ultimo_error   text,
  firmado_en     timestamptz,
  unique (documento_id, orden)
);
create index if not exists firmantes_validacion_idx on firmantes (validacion_id);
create index if not exists firmantes_por_firmar_idx on firmantes (estado) where estado = 'validado';

alter table validaciones add column if not exists firmante_id uuid;
alter table webhooks alter column validacion_id drop not null;
alter table webhooks add column if not exists documento_id uuid;

-- callback_url pasó a llamarse url_confirmacion (webhook) y se sumó url_retorno (redirección del firmante)
do $$ begin
  if exists (select 1 from information_schema.columns where table_name = 'validaciones' and column_name = 'callback_url') then
    alter table validaciones rename column callback_url to url_confirmacion;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'documentos' and column_name = 'callback_url') then
    alter table documentos rename column callback_url to url_confirmacion;
  end if;
end $$;
alter table validaciones add column if not exists url_retorno text;
alter table documentos add column if not exists url_retorno text;

-- ===================== app-admin =====================
-- Rol del usuario del panel: superadmin gestiona clientes y usuarios; operador opera validaciones, documentos y webhooks.
-- Los usuarios que ya existían quedan como superadmin (tenían acceso total).
alter table admins add column if not exists rol text not null default 'superadmin';
-- Webhook descartado a mano desde app-admin: la API deja de reintentarlo.
alter table webhooks add column if not exists descartado_en timestamptz;
alter table webhooks add column if not exists descartado_por text;
create index if not exists auditoria_en_idx on auditoria (en desc);
