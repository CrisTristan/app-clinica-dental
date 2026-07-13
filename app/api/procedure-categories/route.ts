import { requireStaff, requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

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

// Crea una nueva categoría de procedimiento.
//
//   POST /api/procedure-categories
//       body: { nombre }
export async function POST(req: NextRequest) {
  const auth = await requireRole(rolesFor('catalogo'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { nombre } = await req.json()
  if (!nombre || !String(nombre).trim()) {
    return Response.json({ error: "nombre es requerido" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('procedure_categories')
    .insert({ nombre: String(nombre).trim() })
    .select('id, nombre')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data)
}
