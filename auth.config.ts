import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { loginSchema } from "./lib/zod"
import { db } from "./lib/db";
import bcript from "bcryptjs";
import { nanoid } from "nanoid";
import { sendEmailVerification } from "./lib/email";
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

            //verificación de email
            if(!user.emailVerified){

              const verifyTokenExits = await db.verificationToken.findFirst({
                where: {
                  identifier: user.email
                }
              })

              //SI existe un token lo eliminamos
              if(verifyTokenExits?.identifier){
                const deleteToken = await db.verificationToken.delete({
                  where: {
                    identifier: user.email
                  }
                })
              }

              const token = nanoid();

              await db.verificationToken.create({
                data: {
                  identifier: user.email,
                  token,
                  expires: new Date(Date.now()+1000*60*60*24)
                },
              })

              //Enviar email de verificación
              await sendEmailVerification(user.email, token);
              
              throw new Error("Por favor verifique su correo Electronico")
            }
            return user;
          },
        }),
      ],
} satisfies NextAuthConfig