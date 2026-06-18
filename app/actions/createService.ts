"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"

export const createService = async (name: string, price: number) => {
  const auth = await requireRole(rolesFor('catalogo'))
  if (!auth.ok) return null

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('Service')
    .insert({ name, price })
    .select()
    .single()

  if (error) {
    console.log(error)
    return null
  }

  return data
}
