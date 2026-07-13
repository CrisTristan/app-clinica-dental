import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Categorías de procedimiento (procedure_categories) para el selector "tipo".
//
//   GET /api/procedure-categories
//       → { categories: { id, nombre }[] }
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('procedure_categories')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ categories: data ?? [] })
}
