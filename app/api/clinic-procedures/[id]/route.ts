import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

// Actualiza precio, descripción y duración estimada de un procedimiento clínico.
//
//   PATCH /api/clinic-procedures/[id]
//       body: { precio?, descripcion?, duracion_estimada? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(rolesFor('catalogo'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { precio, descripcion, duracion_estimada } = await req.json()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clinic_procedures')
    .update({
      precio: precio === '' || precio == null ? null : Number(precio),
      descripcion: descripcion || null,
      duracion_estimada: duracion_estimada || null,
    })
    .eq('id', id)
    .select('id, nombre, precio, descripcion, duracion_estimada')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}

// Elimina permanentemente un procedimiento clínico.
//
//   DELETE /api/clinic-procedures/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(rolesFor('catalogo'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('clinic_procedures')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
