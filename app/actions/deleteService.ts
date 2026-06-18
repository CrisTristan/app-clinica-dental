"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"

export const deleteService = async (id: number) => {
  const auth = await requireRole(rolesFor('catalogo'))
  if (!auth.ok) return null

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('Service')
    .delete()
    .eq('id', id)

  if (error) {
    console.log(error)
    return null
  }

  return true
}
