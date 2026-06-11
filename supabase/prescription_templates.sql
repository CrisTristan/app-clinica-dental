-- Plantilla única de receta por dentista.
-- Ejecutar en Supabase Dashboard -> SQL Editor.

create table if not exists public.prescription_templates (
  id uuid primary key default gen_random_uuid(),
  dentist_id uuid not null unique references auth.users(id) on delete cascade,
  logo_url text,
  doctor_first_name text not null,
  doctor_last_name text not null,
  doctor_second_last_name text,
  degree_institution text not null,
  professional_license text not null,
  specialty text,
  clinic_address text not null,
  signature_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.prescription_templates is
  'Una plantilla editable de receta médica por dentista.';

alter table public.prescription_templates enable row level security;

drop policy if exists "dentists_read_own_prescription_template"
  on public.prescription_templates;

create policy "dentists_read_own_prescription_template"
  on public.prescription_templates
  for select
  using (auth.uid() = dentist_id);

drop policy if exists "dentists_insert_own_prescription_template"
  on public.prescription_templates;

create policy "dentists_insert_own_prescription_template"
  on public.prescription_templates
  for insert
  with check (auth.uid() = dentist_id);

drop policy if exists "dentists_update_own_prescription_template"
  on public.prescription_templates;

create policy "dentists_update_own_prescription_template"
  on public.prescription_templates
  for update
  using (auth.uid() = dentist_id)
  with check (auth.uid() = dentist_id);
