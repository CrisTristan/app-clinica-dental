"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export const savePatientBudgets = async (id: number, budgets: unknown) => {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('Patient')
    .update({ servicios: budgets })
    .eq('id', Number(id))
    .select()
    .single()

  if (error) {
    console.log(error)
    return null
  }

  return data
}
