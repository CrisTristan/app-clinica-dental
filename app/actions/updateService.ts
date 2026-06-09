"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export const updateService = async (id: number, name: string, price: number) => {
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
