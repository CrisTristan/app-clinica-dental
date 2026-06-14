"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireStaff } from "@/lib/auth-guard"

export const getServices = async () => {
  const auth = await requireStaff()
  if (!auth.ok) return null

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('Service')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.log(error)
    return null
  }

  return data
}
