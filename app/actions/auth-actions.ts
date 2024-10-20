"use server"
import {signIn} from "@/auth"
import { db } from "@/lib/db"
import {loginSchema, registerSchema} from "@/lib/zod"
import { error } from "console"
import { AuthError } from "next-auth"
import { redirect } from "next/dist/server/api-utils"
import {z} from "zod"
import bcrypt from "bcryptjs"

export const loginAction = async (values: z.infer<typeof loginSchema>)=>{
    try {
       await signIn('credentials', { 
        email: values.email,
        password: values.password,
        redirect: false,
       }) 
       return {success: true}
    } catch (error) {
        if(error instanceof AuthError){
            return {error: error.cause?.err?.message};
        }
        return {error: "error 500"};
    }
}

export const registerAction = async (values: z.infer<typeof registerSchema>)=>{
    try {
       
        const {data, success} = registerSchema.safeParse(values)
        if(!success){
            return {
                error: "Invcalid data",    
            }
        }

        //verificar si el usuario existe.
        const user = await db.user.findUnique({
            where: {
                email: data.email,
            },
        });

        if(user){
            return {
                error: "El usuario ya existe",
            }
        }

        //hash de la contraseña
        const passwordHash =  await bcrypt.hash(data.password, 10);

        //crear el usuario
        await db.user.create({
            data: {
                email: data.email,
                name: data.name,
                password: passwordHash,
            }
        });

        //Iniciamos seción directamente
        await signIn('credentials', { 
            email: values.email,
            password: values.password,
            redirect: false,
        })

        return {success: true}
    } catch (error) {
        if(error instanceof AuthError){
            return {error: error.cause?.err?.message};
        }
        return {error: "error 500"};
    }
}