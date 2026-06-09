"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export const createService = async (name: string, price: number) => {
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
