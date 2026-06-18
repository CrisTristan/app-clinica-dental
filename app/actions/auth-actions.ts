"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { loginSchema, registerSchema } from "@/lib/zod"
import { redirect } from "next/navigation"
import { z } from "zod"

export const loginAction = async (values: z.infer<typeof loginSchema>) => {
  const { data, success } = loginSchema.safeParse(values)
  if (!success) return { error: "Datos inválidos" }

  const supabase = await createClient()
  const { error, data: { user } } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) return { error: error.message }

  // Verificar rol en la tabla profiles (no en metadata editable por el usuario)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  if (!profile) {
    await supabase.auth.signOut()
    return { error: "Tu cuenta no tiene un rol asignado. Contacta al administrador." }
  }

  redirect("/pacientes")
}

// Solo administradores autenticados pueden registrar nuevos usuarios
export const registerAction = async (values: z.infer<typeof registerSchema>) => {
  const { data, success } = registerSchema.safeParse(values)
  if (!success) return { error: "Datos inválidos" }

  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { error: "No autorizado" }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return { error: "Solo los administradores pueden registrar usuarios" }
  }

  // Usar admin client para crear el usuario sin afectar la sesión del admin
  const adminClient = createAdminClient()
  const { data: created, error } = await adminClient.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    ...(data.phone ? { phone: data.phone } : {}),
    user_metadata: { name: data.name },
  })

  if (error) return { error: error.message }

  return {
    success: true,
    userId: created.user.id,
    message: `Usuario creado. Asigna el rol en /api/admin/users con userId: ${created.user.id}`,
  }
}
