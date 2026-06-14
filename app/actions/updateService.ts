"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth-guard"

export const updateService = async (id: number, name: string, price: number) => {
  const auth = await requireAdmin()
  if (!auth.ok) return null

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('Service')
    .update({ name, price })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.log(error)
    return null
  }

  return data
}
