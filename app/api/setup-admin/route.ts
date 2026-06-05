import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

// Ruta temporal para crear/promover usuarios
// ELIMINAR después de configurar el primer admin
export async function POST(req: NextRequest) {
  const { email, password, role = "admin", secret } = await req.json()

  if (secret !== process.env.SETUP_SECRET) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!["admin", "recepcionista"].includes(role)) {
    return Response.json({ error: "Rol inválido. Usa: admin o recepcionista" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existing = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      user_metadata: { ...existing.user_metadata, role }
    })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ success: true, message: `${email} actualizado a ${role}` })
  }

  if (!password) {
    return Response.json({ error: "Usuario no existe, envía también 'password' para crearlo" }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role }
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true, message: `${email} creado como ${role}` })
}
