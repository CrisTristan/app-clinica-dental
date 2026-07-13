import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Lista completa de procedimientos propios de la clínica (clinic_procedures).
//
//   GET /api/clinic-procedures
//       → { procedures: { id, nombre }[] }
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clinic_procedures')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ procedures: data ?? [] })
}
