-- ============================================================
-- MIGRACION: Asignar dentista responsable a cada cita
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

-- Nueva columna en Appointment. Se deja nullable para no romper citas existentes;
-- la API del scheduler exige el valor en nuevas citas creadas desde el popup.
alter table public."Appointment"
  add column if not exists "dentistId" uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'Appointment_dentistId_fkey'
  ) then
    alter table public."Appointment"
      add constraint "Appointment_dentistId_fkey"
      foreign key ("dentistId")
      references public.profiles(id)
      on update cascade
      on delete set null;
  end if;
end $$;

create index if not exists "Appointment_dentistId_idx"
  on public."Appointment" ("dentistId");

comment on column public."Appointment"."dentistId" is
  'Perfil con rol dentista que atendera esta cita.';

-- Defensa en base de datos: si se asigna dentista, evita usar recepcionistas/admins.
create or replace function public.ensure_appointment_dentist_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new."dentistId" is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = new."dentistId"
      and role = 'dentista'
  ) then
    raise exception 'dentistId must reference a profile with role dentista';
  end if;

  return new;
end;
$$;

drop trigger if exists "ensure_appointment_dentist_role_trigger"
  on public."Appointment";

create trigger "ensure_appointment_dentist_role_trigger"
  before insert or update of "dentistId"
  on public."Appointment"
  for each row
  execute function public.ensure_appointment_dentist_role();
