import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

// Inventario físico de la clínica: materiales del catálogo (materials) ya
// enlazados a un inventory_items mediante materials.inventory_item_id.
//
//   GET /api/inventory
//       → { items: { material_id, clave, descripcion,
//                    material_name: { id, nombre, treatment_id },
//                    grupo, tratamiento,
//                    item: { id, unidad_medica, costo, precio, stock, se_vende, activo } }[] }
export async function GET() {
  const auth = await requireRole(rolesFor('inventario'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('materials')
    .select(`
      id, clave, descripcion, inventory_item_id,
      inventory_items(id, unidad_medica, costo, precio, stock, se_vende, activo),
      material_names(id, nombre, treatment_id, material_groups(id, nombre), dental_treatments(id, nombre))
    `)
    .not('inventory_item_id', 'is', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const items = (data ?? [])
    .filter((m: any) => m.inventory_items)
    .map((m: any) => ({
      material_id: m.id,
      clave: m.clave,
      descripcion: m.descripcion,
      material_name: m.material_names
        ? { id: m.material_names.id, nombre: m.material_names.nombre, treatment_id: m.material_names.treatment_id }
        : null,
      grupo: m.material_names?.material_groups?.nombre ?? null,
      tratamiento: m.material_names?.dental_treatments?.nombre ?? null,
      item: m.inventory_items,
    }))
    .sort((a: any, b: any) =>
      (a.material_name?.nombre ?? '').localeCompare(b.material_name?.nombre ?? '', 'es')
    )

  return Response.json({ items })
}

// Asigna un material del catálogo al inventario de la clínica: crea el
// inventory_items y lo enlaza en materials.inventory_item_id. Opcionalmente
// asocia el material a un tratamiento (material_names.treatment_id).
//
//   POST /api/inventory
//       body: { material_id, unidad_medica, costo?, precio?, stock?,
//               se_vende?, treatment_id? }
export async function POST(req: NextRequest) {
  const auth = await requireRole(rolesFor('inventario'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { material_id, unidad_medica, costo, precio, stock, se_vende, treatment_id } = await req.json()

  if (!material_id) {
    return Response.json({ error: "material_id es requerido" }, { status: 400 })
  }
  if (!unidad_medica || !String(unidad_medica).trim()) {
    return Response.json({ error: "La unidad de medida es requerida" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // El material debe existir y no estar ya en el inventario.
  const { data: material, error: matError } = await supabase
    .from('materials')
    .select('id, inventory_item_id, material_name_id')
    .eq('id', material_id)
    .single()

  if (matError || !material) {
    return Response.json({ error: "Material no encontrado" }, { status: 404 })
  }
  if (material.inventory_item_id) {
    return Response.json({ error: "Este material ya está en el inventario" }, { status: 409 })
  }

  const { data: item, error: itemError } = await supabase
    .from('inventory_items')
    .insert({
      unidad_medica: String(unidad_medica).trim(),
      costo: costo === '' || costo == null ? null : Number(costo),
      precio: precio === '' || precio == null ? null : Number(precio),
      stock: stock === '' || stock == null ? 0 : Number(stock),
      se_vende: !!se_vende,
      activo: true,
    })
    .select('id, unidad_medica, costo, precio, stock, se_vende, activo')
    .single()

  if (itemError) return Response.json({ error: itemError.message }, { status: 500 })

  const { error: linkError } = await supabase
    .from('materials')
    .update({ inventory_item_id: item.id })
    .eq('id', material_id)

  if (linkError) {
    // Sin el enlace el item quedaría huérfano: se revierte.
    await supabase.from('inventory_items').delete().eq('id', item.id)
    return Response.json({ error: linkError.message }, { status: 500 })
  }

  // Asignación opcional del tratamiento donde se usa este material.
  if (treatment_id !== undefined && material.material_name_id) {
    await supabase
      .from('material_names')
      .update({ treatment_id: treatment_id ? Number(treatment_id) : null })
      .eq('id', material.material_name_id)
  }

  return Response.json({ item })
}
