import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

// Catálogo completo de materiales de apoyo (tabla materials) con su nombre,
// especialidad (material_groups) y si ya están asignados al inventario.
//
//   GET /api/inventory/catalog
//       → { materials: { id, clave, descripcion, inventory_item_id,
//                        material_name: { id, nombre, treatment_id },
//                        grupo: string | null }[] }
export async function GET() {
  const auth = await requireRole(rolesFor('inventario'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('materials')
    .select('id, clave, descripcion, inventory_item_id, material_names(id, nombre, treatment_id, material_groups(id, nombre))')
    .order('clave', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const materials = (data ?? []).map((m: any) => ({
    id: m.id,
    clave: m.clave,
    descripcion: m.descripcion,
    inventory_item_id: m.inventory_item_id,
    material_name: m.material_names
      ? { id: m.material_names.id, nombre: m.material_names.nombre, treatment_id: m.material_names.treatment_id }
      : null,
    grupo: m.material_names?.material_groups?.nombre ?? null,
  }))

  return Response.json({ materials })
}
