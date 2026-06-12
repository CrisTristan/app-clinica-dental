-- ============================================================
-- MIGRACIÓN: Bitácora de auditoría de cambios financieros
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Registra quién hizo qué y cuándo sobre servicios y abonos:
--   - crear / editar / eliminar servicios (Patient_Services)
--   - crear / editar abonos (Payment_History)
--
-- La tabla es APPEND-ONLY: un trigger bloquea UPDATE y DELETE
-- incluso para el service_role. Para depurar registros habría
-- que eliminar el trigger manualmente desde el SQL Editor.
-- ============================================================

create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),

  -- Quién (snapshot del nombre por si el perfil se elimina después)
  user_id    uuid references public.profiles(id) on delete set null,
  user_name  text,

  -- Qué
  action     text not null check (action in ('crear', 'editar', 'eliminar')),
  entity     text not null check (entity in ('servicio', 'abono')),
  entity_id  text not null,

  -- Contexto legible aunque el paciente/servicio se borre después
  patient_name text,
  service_name text,

  -- Detalle del cambio: { antes: {...}, despues: {...}, ... }
  details    jsonb not null default '{}'::jsonb
);

comment on table public.audit_log is
  'Bitácora inmutable de cambios financieros. Escritura via service_role; lectura solo admin.';

-- Índices para los filtros de la pantalla de auditoría
create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);
create index if not exists idx_audit_log_user_id    on public.audit_log (user_id);
create index if not exists idx_audit_log_entity     on public.audit_log (entity, action);

-- RLS: solo admins pueden leer; nadie inserta desde el cliente
-- (las API routes insertan con service_role, que omite RLS)
alter table public.audit_log enable row level security;

drop policy if exists "admin_read_audit_log" on public.audit_log;
create policy "admin_read_audit_log" on public.audit_log
  for select using (public.is_admin());

-- Inmutabilidad: los triggers aplican también al service_role
create or replace function public.audit_log_block_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log es de solo lectura: no se permite % en registros de auditoría', TG_OP;
end;
$$;

drop trigger if exists audit_log_immutable on public.audit_log;
create trigger audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.audit_log_block_changes();
