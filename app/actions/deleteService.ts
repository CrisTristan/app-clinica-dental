"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export const deleteService = async (id: number) => {
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
