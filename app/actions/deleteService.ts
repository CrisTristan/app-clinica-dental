"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth-guard"

export const deleteService = async (id: number) => {
  const auth = await requireAdmin()
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
