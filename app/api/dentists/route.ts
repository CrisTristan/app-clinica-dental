import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Lista los usuarios clínicos disponibles para asignarlos como responsables de una cita.
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, nombre, role')
    .eq('role', 'dentista')
    .order('nombre', { ascending: true })

  if (profilesError) {
    return Response.json({ error: profilesError.message }, { status: 500 })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    return Response.json({ error: authError.message }, { status: 500 })
  }

  const userMap = new Map(authData.users.map(user => [user.id, user]))

  return Response.json(
    (profiles ?? []).map(profile => {
      const user = userMap.get(profile.id)

      return {
        id: profile.id,
        nombre: profile.nombre,
        role: profile.role,
        email: user?.email ?? null,
        phone: user?.phone ?? null,
      }
    }),
  )
}
