-- ============================================================
-- FUNCIÓN: create_treatment_plan
-- Crea un plan de tratamiento completo de forma ATÓMICA.
-- Ejecutar en: Supabase Dashboard → SQL Editor
--
-- Envuelve en una sola transacción:
--   1. Inserta cada procedimiento en clinic_procedures (en orden).
--   2. Crea el treatment_plans.
--   3. Enlaza los procedimientos en treatment_plan_procedures.
--   4. (Opcional) Genera la hoja de consentimiento en consents.
-- Si cualquier paso falla, se revierte todo.
--
-- p_procedures es un arreglo JSON con la forma:
--   [{ "nombre": "...", "catalog_key": "...", "custom": false,
--      "cantidad": 1, "precio": "150.00" }, ...]
-- ============================================================

create or replace function public.create_treatment_plan(
  p_patient_id            bigint,
  p_treatment_id          bigint,
  p_dentist_id            uuid,
  p_total                 numeric,
  p_generar_consentimiento boolean,
  p_procedures            jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proc       jsonb;
  v_clinic_id  bigint;
  v_plan_id    bigint;
  v_clinic_ids bigint[] := '{}';
  v_i          int := 0;
begin
  -- 1. Insertar procedimientos en clinic_procedures conservando el orden.
  --    Los propios (custom) van con dental_procedure_id NULL; los del catálogo
  --    apuntan a dental_procedures vía catalog_key.
  --    NOTA: si dental_procedure_id es numérico en tu esquema, cambia
  --    `nullif(v_proc->>'catalog_key','')` por `(v_proc->>'catalog_key')::bigint`.
  for v_proc in select * from jsonb_array_elements(p_procedures)
  loop
    insert into clinic_procedures (dental_procedure_id, nombre)
    values (
      case
        when coalesce((v_proc->>'custom')::boolean, false) then null
        else nullif(v_proc->>'catalog_key', '')
      end,
      v_proc->>'nombre'
    )
    returning id into v_clinic_id;

    v_clinic_ids := array_append(v_clinic_ids, v_clinic_id);
  end loop;

  -- 2. Crear el plan de tratamiento.
  insert into treatment_plans (treatment_id, patient_id, dentist_id, total)
  values (p_treatment_id, p_patient_id, p_dentist_id, p_total)
  returning id into v_plan_id;

  -- 3. Enlazar cada procedimiento con el plan (mismo orden que el arreglo).
  for v_proc in select * from jsonb_array_elements(p_procedures)
  loop
    v_i := v_i + 1;
    insert into treatment_plan_procedures (
      treatment_plan_id, clinic_procedure_id, cantidad, precio_unitario
    )
    values (
      v_plan_id,
      v_clinic_ids[v_i],
      coalesce((v_proc->>'cantidad')::int, 1),
      nullif(v_proc->>'precio', '')::numeric
    );
  end loop;

  -- 4. Hoja de consentimiento (opcional).
  if p_generar_consentimiento then
    insert into consents (patient_id, treatment_plan_id)
    values (p_patient_id, v_plan_id);
  end if;

  return v_plan_id;
end;
$$;
