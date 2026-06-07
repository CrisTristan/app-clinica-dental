"use server"

import { createClient } from "@/lib/supabase/server"
import { loginSchema, registerSchema } from "@/lib/zod"
import { z } from "zod"

export const loginAction = async (values: z.infer<typeof loginSchema>) => {
  const { data, success } = loginSchema.safeParse(values)
  if (!success) return { error: "Datos inválidos" }

  const supabase = await createClient()
  const { error, data: {user} } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) return { error: error.message }
  return { success: true, userRol: user?.user_metadata?.role}
}

export const registerAction = async (values: z.infer<typeof registerSchema>) => {
  const { data, success } = registerSchema.safeParse(values)
  if (!success) return { error: "Datos inválidos" }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        role: 'recepcionista',
      },
    },
  })

  if (error) return { error: error.message }
  return { success: true }
}
