"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth-guard"

export const createService = async (name: string, price: number) => {
  const auth = await requireAdmin()
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
