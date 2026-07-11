import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Catálogo de tratamientos dentales para el selector de "Nuevo tratamiento".
//
//   GET /api/dental-treatments
//       → { treatments: { id, nombre }[] }
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('dental_treatments')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ treatments: data ?? [] })
}
