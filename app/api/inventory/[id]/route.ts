import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

// Operaciones sobre un item del inventario (inventory_items.id).
//
//   PATCH /api/inventory/[id]
//       body: campos opcionales { unidad_medica, costo, precio, stock,
//              se_vende, activo, material_name_id?, treatment_id? }
//       `treatment_id` (junto con `material_name_id`) reasigna el tratamiento
//       donde se usa el material; `treatment_id: null` lo desasigna.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(rolesFor('inventario'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if (body.unidad_medica !== undefined) {
    if (!String(body.unidad_medica).trim()) {
      return Response.json({ error: "La unidad de medida no puede quedar vacía" }, { status: 400 })
    }
    updates.unidad_medica = String(body.unidad_medica).trim()
  }
  if (body.costo !== undefined) updates.costo = body.costo === '' || body.costo == null ? null : Number(body.costo)
  if (body.precio !== undefined) updates.precio = body.precio === '' || body.precio == null ? null : Number(body.precio)
  if (body.stock !== undefined) updates.stock = Math.max(0, Number(body.stock) || 0)
  if (body.se_vende !== undefined) updates.se_vende = !!body.se_vende
  if (body.activo !== undefined) updates.activo = !!body.activo

  const supabase = createAdminClient()

  let item = null
  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(updates)
      .eq('id', Number(id))
      .select('id, unidad_medica, costo, precio, stock, se_vende, activo')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    item = data
  }

  if (body.treatment_id !== undefined && body.material_name_id) {
    const { error } = await supabase
      .from('material_names')
      .update({ treatment_id: body.treatment_id ? Number(body.treatment_id) : null })
      .eq('id', Number(body.material_name_id))

    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ item })
}

//   DELETE /api/inventory/[id]
//       Quita el material del inventario: desenlaza materials.inventory_item_id
//       y elimina el registro de inventory_items. El material sigue disponible
//       en el catálogo para agregarse de nuevo.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(rolesFor('inventario'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  const { error: unlinkError } = await supabase
    .from('materials')
    .update({ inventory_item_id: null })
    .eq('inventory_item_id', Number(id))

  if (unlinkError) return Response.json({ error: unlinkError.message }, { status: 500 })

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', Number(id))

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
