import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const auth = await requireRole(rolesFor('cobros'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('Service')
    .select('*')
    .order('name', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
