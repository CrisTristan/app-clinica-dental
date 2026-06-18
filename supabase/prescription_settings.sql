-- Configuracion global compartida por todas las recetas medicas.
-- Ejecutar en Supabase Dashboard -> SQL Editor.

create table if not exists public.prescription_settings (
  id text primary key default 'global',
  logo_url text,
  clinic_name text,
  clinic_address text not null,
  clinic_phone text,
  orientation text not null default 'horizontal',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescription_settings_singleton check (id = 'global'),
  constraint prescription_settings_orientation check (orientation in ('horizontal', 'vertical'))
);

alter table public.prescription_settings
  add column if not exists clinic_name text;

alter table public.prescription_settings
  add column if not exists clinic_phone text;

alter table public.prescription_settings
  add column if not exists orientation text not null default 'horizontal';

alter table public.prescription_settings
  drop constraint if exists prescription_settings_orientation;

alter table public.prescription_settings
  add constraint prescription_settings_orientation check (orientation in ('horizontal', 'vertical'));

alter table public.prescription_templates
  alter column clinic_address drop not null;

comment on table public.prescription_settings is
  'Configuracion global de identidad, contacto, domicilio y orientacion para todas las recetas medicas.';

alter table public.prescription_settings enable row level security;

drop policy if exists "staff_read_prescription_settings"
  on public.prescription_settings;

create policy "staff_read_prescription_settings"
  on public.prescription_settings
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dentista')
    )
  );

drop policy if exists "staff_upsert_prescription_settings"
  on public.prescription_settings;

create policy "staff_upsert_prescription_settings"
  on public.prescription_settings
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dentista')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'dentista')
    )
  );
