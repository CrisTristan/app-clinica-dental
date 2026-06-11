"use server"

import { createClient } from "@/lib/supabase/server"

export const authentication = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    user: {
      ...user,
      role: profile.role as 'admin' | 'recepcionista' | 'dentista',
    }
  }
}
