-- ============================================================
-- MIGRACIÓN: Cobro de abonos atómico (a prueba de carreras y
-- de fallos parciales).
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Problema que resuelve:
--   Antes, registrar/editar un abono hacía dos escrituras sueltas
--   (insertar el pago + actualizar Patient_Services.balance). Si la
--   segunda fallaba, o dos cobros entraban a la vez, el `balance`
--   quedaba descuadrado respecto a la suma real de Payment_History.
--
-- Solución:
--   Toda la lógica vive en una función que corre en UNA transacción
--   con bloqueo de la fila del servicio (SELECT ... FOR UPDATE) y
--   recalcula el balance SIEMPRE desde la suma real de abonos. Así:
--     - es atómico (o pasa todo o nada),
--     - es a prueba de carreras (los cobros concurrentes se serializan),
--     - es auto-reparable (el balance se deriva de la verdad, no de un
--       número cacheado).
--
-- El campo Patient_Services.balance SIGUE EXISTIENDO; solo cambia cómo
-- se escribe. Nada de lo que ya lee `balance` (tarjetas, /reportes)
-- necesita tocarse.
-- ============================================================

-- ── Registrar un abono nuevo ────────────────────────────────
create or replace function public.registrar_abono(
  p_service_id text,
  p_abono      numeric,
  p_metodo     text,
  p_user       uuid
)
returns table (payment_id bigint, abono numeric, fecha date, new_balance numeric)
language plpgsql
as $$
declare
  v_price   numeric;
  v_paid    numeric;
  v_applied numeric;
  v_pay_id  bigint;
  v_fecha   date := current_date;
begin
  -- Bloqueo de la fila del servicio: serializa cobros concurrentes.
  -- v_paid = lo realmente abonado hasta ahora (fuente de verdad).
  select s.price,
         coalesce((select sum(ph.abono) from public."Payment_History" ph
                    where ph.patient_service_id = p_service_id), 0)
    into v_price, v_paid
    from public."Patient_Services" s
   where s.id = p_service_id
   for update;

  -- Servicio inexistente: 0 filas -> la API responde 404.
  if v_price is null then
    return;
  end if;

  -- Cobra solo lo justo: nunca por encima de lo que realmente se debe.
  v_applied := least(p_abono, greatest(v_price - v_paid, 0));

  insert into public."Payment_History"
    (patient_service_id, abono, fecha, metodo_pago, registrado_por)
  values
    (p_service_id, v_applied, v_fecha, p_metodo, p_user)
  returning id into v_pay_id;

  -- Balance derivado de la suma real (auto-reparable).
  update public."Patient_Services"
     set balance = v_price - (v_paid + v_applied)
   where id = p_service_id;

  return query
    select v_pay_id, v_applied, v_fecha, v_price - (v_paid + v_applied);
end;
$$;

-- ── Editar un abono existente ───────────────────────────────
create or replace function public.editar_abono(
  p_payment_id bigint,
  p_service_id text,
  p_abono      numeric,
  p_metodo     text default null
)
returns table (payment_id bigint, abono numeric, fecha date, new_balance numeric)
language plpgsql
as $$
declare
  v_price      numeric;
  v_other_paid numeric;
  v_applied    numeric;
  v_fecha      date := current_date;
  v_exists     boolean;
begin
  select exists(
    select 1 from public."Payment_History"
     where id = p_payment_id and patient_service_id = p_service_id
  ) into v_exists;

  -- v_other_paid = suma de los OTROS abonos del servicio (sin contar este).
  select s.price,
         coalesce((select sum(ph.abono) from public."Payment_History" ph
                    where ph.patient_service_id = p_service_id
                      and ph.id <> p_payment_id), 0)
    into v_price, v_other_paid
    from public."Patient_Services" s
   where s.id = p_service_id
   for update;

  -- Pago o servicio inexistente: 0 filas -> la API responde 404.
  if v_price is null or not v_exists then
    return;
  end if;

  -- Tope: el abono editado nunca puede superar lo que resta por pagar.
  v_applied := least(p_abono, greatest(v_price - v_other_paid, 0));

  update public."Payment_History"
     set abono       = v_applied,
         fecha       = v_fecha,
         metodo_pago = coalesce(p_metodo, metodo_pago)
   where id = p_payment_id;

  update public."Patient_Services"
     set balance = v_price - (v_other_paid + v_applied)
   where id = p_service_id;

  return query
    select p_payment_id, v_applied, v_fecha, v_price - (v_other_paid + v_applied);
end;
$$;

-- ── Permisos ────────────────────────────────────────────────
-- Solo el service_role (API routes en el servidor) puede ejecutarlas.
-- Se revoca PUBLIC para que nadie las llame directo desde el cliente.
revoke execute on function public.registrar_abono(text, numeric, text, uuid) from public;
revoke execute on function public.editar_abono(bigint, text, numeric, text)  from public;
grant  execute on function public.registrar_abono(text, numeric, text, uuid) to service_role;
grant  execute on function public.editar_abono(bigint, text, numeric, text)  to service_role;

-- ============================================================
-- SEGURO BARATO (opcional): consulta de reconciliación.
-- Lista los servicios cuyo `balance` no coincide con la suma real
-- de abonos. Si todo está sano, no devuelve filas. Córrela cuando
-- sospeches un descuadre histórico:
--
--   select s.id, s.name, s.price, s.balance,
--          coalesce(sum(ph.abono), 0)                       as abonado,
--          s.price - coalesce(sum(ph.abono), 0)             as balance_correcto,
--          s.balance - (s.price - coalesce(sum(ph.abono),0)) as diferencia
--     from public."Patient_Services" s
--     left join public."Payment_History" ph
--            on ph.patient_service_id = s.id
--    group by s.id, s.name, s.price, s.balance
--   having s.balance <> s.price - coalesce(sum(ph.abono), 0);
-- ============================================================
