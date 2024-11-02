"use server"
import { auth } from "@/auth"

export const authentication = async ()=>{
    const session = await auth();
    return session;
}