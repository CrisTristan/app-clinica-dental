import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Normaliza para comparar/ordenar sin acentos ni mayúsculas.
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()

// Lista combinada de procedimientos para el selector "Otros procedimientos":
// primero los propios de la clínica (clinic_procedures) y luego los del catálogo
// normativo (dental_procedures) que aún no estén representados en la clínica.
//
//   GET /api/procedures
//       → { procedures: { value, nombre, source: "clinic" | "catalog" }[] }
//         · value: "clinic:<id>" o "catalog:<catalog_key>"
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()

  const [{ data: clinic, error: clinicError }, { data: dental, error: dentalError }] = await Promise.all([
    supabase.from("clinic_procedures").select("id, nombre, dental_procedure_id").order("nombre", { ascending: true }),
    supabase.from("dental_procedures").select("catalog_key, nombre").order("nombre", { ascending: true }),
  ])

  if (clinicError) return Response.json({ error: clinicError.message }, { status: 500 })
  if (dentalError) return Response.json({ error: dentalError.message }, { status: 500 })

  // 1. Procedimientos de la clínica, deduplicados por nombre (clinic_procedures
  //    acumula una fila por cada uso en un plan, así que hay repetidos).
  const seenNames = new Set<string>()
  const clinicProcedures = (clinic ?? [])
    .filter(row => {
      const key = norm(row.nombre)
      if (!key || seenNames.has(key)) return false
      seenNames.add(key)
      return true
    })
    .map(row => ({ value: `clinic:${row.id}`, nombre: row.nombre, source: "clinic" as const }))

  // 2. Catálogo normativo, excluyendo lo ya ligado desde la clínica
  //    (dental_procedure_id) o cuyo nombre ya aparece entre los de la clínica.
  const linkedKeys = new Set(
    (clinic ?? []).map(row => row.dental_procedure_id).filter(Boolean).map(String),
  )
  const catalogProcedures = (dental ?? [])
    .filter(row => !linkedKeys.has(String(row.catalog_key)) && !seenNames.has(norm(row.nombre)))
    .map(row => ({ value: `catalog:${row.catalog_key}`, nombre: row.nombre, source: "catalog" as const }))

  return Response.json({ procedures: [...clinicProcedures, ...catalogProcedures] })
}
