"use server"

import { createClient } from "@/lib/supabase/server"

export const authentication = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return {
    user: {
      ...user,
      role: user.user_metadata?.role ?? 'user',
    }
  }
}
