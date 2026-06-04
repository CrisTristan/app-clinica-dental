import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { loginSchema } from "./lib/zod"
import { db } from "./lib/db"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { sendEmailVerification } from "./lib/email"

export default {
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const { data, success } = loginSchema.safeParse(credentials)

        if (!success) {
          throw new Error("Invalid credentials")
        }

        const user = await db.user.findUnique({
          where: {
            email: data.email,
          },
        })

        if (!user || !user.password) {
          throw new Error("No se encontro el usuario")
        }

        const isValid = await bcrypt.compare(data.password, user.password)

        if (!isValid) {
          throw new Error("Contrasena incorrecta")
        }

        if (!user.emailVerified) {
          const verifyTokenExists = await db.verificationToken.findFirst({
            where: {
              identifier: user.email,
            },
          })

          if (verifyTokenExists?.identifier) {
            await db.verificationToken.delete({
              where: {
                identifier: user.email,
              },
            })
          }

          const token = nanoid()

          await db.verificationToken.create({
            data: {
              identifier: user.email,
              token,
              expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
            },
          })

          await sendEmailVerification(user.email, token)

          throw new Error("Por favor verifique su correo electronico")
        }

        return user
      },
    }),
  ],
} satisfies NextAuthOptions
