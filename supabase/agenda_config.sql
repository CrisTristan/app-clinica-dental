-- Configuracion global de la agenda de citas.
-- Fila unica (id = 'global') que alimenta los props del <Scheduler /> en
-- app/components/scheduler.tsx.
-- Ejecutar en Supabase Dashboard -> SQL Editor.
--
-- Mapeo columna -> prop de @aldabil/react-scheduler:
--
--   default_view    -> view="week"                  ("day" | "week" | "month")
--   hour_format     -> hourFormat="24"              ("12" | "24")
--   days_week       -> week.weekDays: [0..6]        (0 = domingo)
--   start_day_week  -> week.weekStartOn: 1          (0 = domingo, 1 = lunes)
--   start_hour      -> week.startHour / day.startHour  (hora entera 0..24)
--   end_hour        -> week.endHour   / day.endHour    (hora entera 0..24)
--   time_interval   -> week.step / day.step            (minutos)

-- Valida days_week: sin nulos, sin duplicados, de 1 a 7 dias y todos en 0..6.
-- Va en una funcion porque un CHECK no admite subconsultas.
create or replace function public.agenda_config_valid_days(days smallint[])
returns boolean
language sql
immutable
as $$
  select days is not null
     and cardinality(days) between 1 and 7
     and (select bool_and(d is not null and d between 0 and 6) from unnest(days) as d)
     and cardinality(days) = (select count(distinct d) from unnest(days) as d);
$$;

create table if not exists public.agenda_config (
  id text primary key default 'global',
  default_view text not null default 'week',
  hour_format smallint not null default 24,
  days_week smallint[] not null default '{0,1,2,3,4,5,6}',
  start_day_week smallint not null default 1,
  -- La libreria solo acepta horas enteras (DayHours = 0..24): de ahi el check
  -- que obliga a minutos y segundos en cero. '24:00:00' es valido en Postgres
  -- y es el maximo representable.
  start_hour time not null default '08:00:00',
  end_hour time not null default '20:00:00',
  time_interval smallint not null default 60,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_config_singleton check (id = 'global'),
  constraint agenda_config_default_view check (default_view in ('month', 'week', 'day')),
  constraint agenda_config_hour_format check (hour_format in (12, 24)),
  constraint agenda_config_time_interval check (time_interval in (15, 30, 60)),
  constraint agenda_config_start_day_week check (start_day_week between 0 and 6),
  constraint agenda_config_days_week check (public.agenda_config_valid_days(days_week)),
  constraint agenda_config_start_hour_exacta check (
    extract(minute from start_hour) = 0 and extract(second from start_hour) = 0
  ),
  constraint agenda_config_end_hour_exacta check (
    extract(minute from end_hour) = 0 and extract(second from end_hour) = 0
  ),
  constraint agenda_config_rango_horario check (end_hour > start_hour)
);

comment on table public.agenda_config is
  'Configuracion global de la agenda: vista inicial, formato de hora, dias visibles y rango horario del scheduler de citas.';

comment on column public.agenda_config.default_view is
  'Vista inicial del scheduler: month | week | day.';
comment on column public.agenda_config.hour_format is
  'Formato de hora: 12 o 24.';
comment on column public.agenda_config.days_week is
  'Dias visibles en la vista semanal. 0 = domingo ... 6 = sabado.';
comment on column public.agenda_config.start_day_week is
  'Primer dia de la semana. 0 = domingo, 1 = lunes.';
comment on column public.agenda_config.start_hour is
  'Hora de apertura. Solo horas exactas: el scheduler ignora los minutos.';
comment on column public.agenda_config.end_hour is
  'Hora de cierre. Solo horas exactas; admite 24:00:00.';
comment on column public.agenda_config.time_interval is
  'Duracion en minutos de cada celda: 15, 30 o 60.';

-- Fila unica con los valores que hoy estan fijos en scheduler.tsx.
insert into public.agenda_config (id)
values ('global')
on conflict (id) do nothing;

alter table public.agenda_config enable row level security;

-- Lectura: todo el personal. El scheduler no puede montarse sin su config, asi
-- que cualquier rol que abra la agenda necesita leer esta fila.
drop policy if exists "staff_read_agenda_config"
  on public.agenda_config;

create policy "staff_read_agenda_config"
  on public.agenda_config
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'recepcionista', 'dentista', 'asistente')
    )
  );

-- Escritura: solo admin, es un ajuste global de la clinica.
drop policy if exists "admin_upsert_agenda_config"
  on public.agenda_config;

create policy "admin_upsert_agenda_config"
  on public.agenda_config
  for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
