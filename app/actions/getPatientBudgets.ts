"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export const getPatientBudgets = async (id: number) => {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('Patient')
    .select('servicios')
    .eq('id', Number(id))
    .single()

  if (error) {
    console.log(error)
    return null
  }

  return data
}
