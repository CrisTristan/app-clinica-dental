"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export const getServices = async () => {
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
