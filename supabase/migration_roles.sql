-- ============================================================
-- MIGRACIÓN: Sistema de roles basado en tabla profiles + RLS
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabla de perfiles/roles del personal
--    Solo modificable via service_role (el cliente admin de Next.js)
--    Los usuarios NO pueden escribir su propio perfil

create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  role       text        not null check (role in ('admin', 'recepcionista')),
  nombre     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Roles del personal. Escritura exclusiva via service_role.';

-- 2. Habilitar RLS
alter table public.profiles enable row level security;

-- 3. Política de lectura: cada usuario solo lee su propio perfil
--    (necesario para que el middleware pueda consultar el rol del usuario autenticado)
create policy "staff_read_own_profile" on public.profiles
  for select using (auth.uid() = id);

-- Sin políticas INSERT/UPDATE/DELETE para usuarios → solo service_role puede escribir


-- ============================================================
-- Funciones helper (SECURITY DEFINER evita recursión en RLS)
-- ============================================================

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ============================================================
-- RLS en tablas clínicas
-- Nota: las API routes de Next.js usan service_role y omiten RLS.
-- Estas políticas son defensa en profundidad para acceso directo a BD.
-- ============================================================

-- Pacientes: solo personal con perfil
alter table public."Patient" enable row level security;

create policy "staff_full_access_patients" on public."Patient"
  for all
  using (public.is_staff())
  with check (public.is_staff());


-- Citas: personal gestiona todo; el formulario público puede insertar
alter table public."Appointment" enable row level security;

create policy "staff_full_access_appointments" on public."Appointment"
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- Permite insertar sin sesión (formulario de reserva público)
create policy "public_insert_appointment" on public."Appointment"
  for insert with check (true);


-- Historial dental: solo personal
alter table public."DentalData" enable row level security;

create policy "staff_full_access_dentaldata" on public."DentalData"
  for all
  using (public.is_staff())
  with check (public.is_staff());


-- Estado dental (odontograma simple): solo personal
alter table public."Teeth" enable row level security;

create policy "staff_full_access_teeth" on public."Teeth"
  for all
  using (public.is_staff())
  with check (public.is_staff());


-- Odontograma completo: solo personal
alter table public."Odontogram" enable row level security;

create policy "staff_full_access_odontogram" on public."Odontogram"
  for all
  using (public.is_staff())
  with check (public.is_staff());


-- ============================================================
-- MIGRACIÓN DE USUARIOS EXISTENTES
-- Ejecutar DESPUÉS de crear la tabla profiles.
-- Copia los roles existentes de user_metadata → profiles.
-- Revisar la lista antes de ejecutar; eliminar filas incorrectas.
-- ============================================================

-- Vista previa de usuarios con rol en user_metadata:
-- select id, email, raw_user_meta_data->>'role' as role_actual
-- from auth.users
-- where raw_user_meta_data->>'role' in ('admin', 'recepcionista');

-- Inserción real (descomentar para ejecutar):
-- insert into public.profiles (id, role, nombre)
-- select
--   id,
--   raw_user_meta_data->>'role',
--   raw_user_meta_data->>'name'
-- from auth.users
-- where raw_user_meta_data->>'role' in ('admin', 'recepcionista')
-- on conflict (id) do nothing;


-- ============================================================
-- PRIMER ADMIN (si no existe ningún perfil todavía)
-- Reemplazar '<UUID-DEL-USUARIO>' con el UUID real del admin.
-- ============================================================

-- insert into public.profiles (id, role, nombre)
-- values ('<UUID-DEL-USUARIO>', 'admin', 'Nombre del Admin');
