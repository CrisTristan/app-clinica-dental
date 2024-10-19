"use server"
import {signIn} from "@/auth"
import {loginSchema} from "@/lib/zod"
import { redirect } from "next/dist/server/api-utils"
import {z} from "zod"

export const loginAction = async (values: z.infer<typeof loginSchema>)=>{
    try {
       await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
       }) 
    } catch (error) {
        
    }
}