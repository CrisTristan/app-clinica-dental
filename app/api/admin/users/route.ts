import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth-guard"
import { NextRequest } from "next/server"

// GET /api/admin/users — lista todos los usuarios con su rol y nombre
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const [{ data: authData, error: authError }, { data: profiles }] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase.from('profiles').select('id, role, nombre'),
  ])

  if (authError) return Response.json({ error: authError.message }, { status: 500 })

  const profileMap = new Map(
    profiles?.map(p => [p.id, { role: p.role, nombre: p.nombre }]) ?? []
  )

  return Response.json(
    authData.users.map(u => ({
      id: u.id,
      email: u.email,
      phone: u.phone ?? null,
      role: profileMap.get(u.id)?.role ?? null,
      // Prioridad: profiles.nombre → user_metadata.name
      nombre: profileMap.get(u.id)?.nombre ?? u.user_metadata?.name ?? null,
      created_at: u.created_at,
    }))
  )
}

// POST /api/admin/users — asignar o actualizar rol (y nombre) de un usuario existente
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { userId, role, nombre } = await req.json()

  if (!userId || !role) {
    return Response.json({ error: "userId y role son requeridos" }, { status: 400 })
  }
  if (!['admin', 'recepcionista', 'dentista'].includes(role)) {
    return Response.json({ error: "Rol inválido. Usa: admin, recepcionista o dentista" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        role,
        ...(nombre ? { nombre } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, message: `Rol '${role}' asignado al usuario ${userId}` })
}

// DELETE /api/admin/users — elimina el usuario completo de auth y profiles (cascade)
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { userId } = await req.json()
  if (!userId) return Response.json({ error: "userId requerido" }, { status: 400 })

  if (userId === auth.userId) {
    return Response.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 })
  }

  const supabase = createAdminClient()
  // Eliminar de auth.users → la FK ON DELETE CASCADE limpia profiles automáticamente
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true, message: "Usuario eliminado" })
}
