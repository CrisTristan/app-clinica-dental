import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { loginSchema } from "./lib/zod"
import { db } from "./lib/db";
import bcript from "bcryptjs";
// Notice this is only an object, not a full Auth.js instance
export default {
    providers: [
        Credentials({
          authorize: async (credentials) => {
            
            const {data, success} = loginSchema.safeParse(credentials);

            if(!success){
              throw new Error("Invalid Credentials");
            }

            //Verificar si existe el usuario en la base de datos;
            const user = await db.user.findUnique({
              where: {
                email: data.email,
              },
            })

            if(!user || !user.password){
              throw new Error("No se encontro el usuario")
            }

            //verificar si la contraseña es correcta
            const isValid = await bcript.compare(data.password, user.password)

            if(!isValid){
              throw new Error("contraseña incorrecta");
            }

            return user;
          },
        }),
      ],
} satisfies NextAuthConfig