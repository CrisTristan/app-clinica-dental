import { requireStaff, requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

// Lista completa de procedimientos propios de la clínica (clinic_procedures).
//
//   GET /api/clinic-procedures
//       → { procedures: { id, nombre, precio, descripcion, duracion_estimada }[] }
export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clinic_procedures')
    .select('id, nombre, precio, descripcion, duracion_estimada')
    .order('nombre', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ procedures: data ?? [] })
}

// Crea un procedimiento clínico en clinic_procedures. Si proviene del catálogo
// normativo (dental_procedures) se enlaza mediante dental_procedure_id.
//
//   POST /api/clinic-procedures
//       body: { nombre, dental_procedure_id?, procedure_category_id?,
//               precio?, descripcion?, duracion_estimada? }
export async function POST(req: NextRequest) {
  const auth = await requireRole(rolesFor('catalogo'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const {
    nombre, dental_procedure_id, procedure_category_id,
    precio, descripcion, duracion_estimada,
  } = await req.json()

  if (!nombre) {
    return Response.json({ error: "nombre es requerido" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clinic_procedures')
    .insert({
      nombre,
      dental_procedure_id: dental_procedure_id ? String(dental_procedure_id) : null,
      procedure_category_id: procedure_category_id ? Number(procedure_category_id) : null,
      precio: precio === '' || precio == null ? null : Number(precio),
      descripcion: descripcion || null,
      duracion_estimada: duracion_estimada || null,
    })
    .select('id, nombre, precio, descripcion, duracion_estimada')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
