-- ============================================================
-- MIGRACIÓN: Método de pago y trazabilidad en Payment_History
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Agrega a cada abono:
--   - metodo_pago:     efectivo | tarjeta | transferencia
--   - registrado_por:  usuario del personal que capturó el cobro
--
-- Los abonos existentes quedan como 'efectivo' y sin usuario
-- (registrado_por = null se muestra como "—" en la app).
-- ============================================================

alter table public."Payment_History"
  add column if not exists metodo_pago text not null default 'efectivo';

alter table public."Payment_History"
  drop constraint if exists payment_history_metodo_pago_check;

alter table public."Payment_History"
  add constraint payment_history_metodo_pago_check
  check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia'));

alter table public."Payment_History"
  add column if not exists registrado_por uuid;

-- FK a profiles para que PostgREST permita el join profiles(nombre)
alter table public."Payment_History"
  drop constraint if exists payment_history_registrado_por_fkey;

alter table public."Payment_History"
  add constraint payment_history_registrado_por_fkey
  foreign key (registrado_por) references public.profiles(id)
  on delete set null;

-- Índice para los reportes por rango de fechas
create index if not exists idx_payment_history_fecha
  on public."Payment_History" (fecha);

comment on column public."Payment_History".metodo_pago is
  'Método de cobro: efectivo, tarjeta o transferencia';
comment on column public."Payment_History".registrado_por is
  'Usuario del personal (profiles.id) que capturó el abono';
