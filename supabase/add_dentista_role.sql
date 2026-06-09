-- ============================================================
-- MIGRACIÓN: Agregar rol 'dentista'
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Actualizar el CHECK constraint para aceptar el nuevo rol
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'recepcionista', 'dentista'));
