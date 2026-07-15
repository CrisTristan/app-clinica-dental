import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Catálogo de procedimientos dentales para el selector de "Nuevo tratamiento".
//
//   GET /api/dental-procedures
//       → { procedures: { catalog_key, nombre, procedimiento_type }[] }
//
// procedimiento_type: 'D' diagnóstico | 'Q' quirúrgico | 'T' terapéutico | null otros.
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('dental_procedures')
    .select('catalog_key, nombre, procedimiento_type')
    .order('nombre', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ procedures: data ?? [] })
}
