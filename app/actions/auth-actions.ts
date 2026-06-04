"use server"

import { db } from "@/lib/db"
import { loginSchema, registerSchema } from "@/lib/zod"
import { z } from "zod"
import bcrypt from "bcryptjs"

export const loginAction = async (values: z.infer<typeof loginSchema>) => {
  const { success } = loginSchema.safeParse(values)

  if (!success) {
    return { error: "Invalid data" }
  }

  return { success: true }
}

export const registerAction = async (values: z.infer<typeof registerSchema>) => {
  try {
    const { data, success } = registerSchema.safeParse(values)

    if (!success) {
      return { error: "Invalid data" }
    }

    const user = await db.user.findUnique({
      where: {
        email: data.email,
      },
    })

    if (user) {
      return { error: "El usuario ya existe" }
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: passwordHash,
      },
    })

    return { success: true }
  } catch {
    return { error: "error 500" }
  }
}
