"use server"

import {Resend} from "resend"

const resend = new Resend(process.env.AUTH_RESEND_KEY)

export const sendEmailVerification = async (email: string, token: string)=>{
    try {
        await resend.emails.send({
            from: "onboarding@resend.dev",
            to: email,
            subject: "Verifica tu Email",
            html: `
                <p>Click en el enlace de abajo para verificar tu email</p>
                <a href="${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}">Verificar Email</a>
            `
        })

        return {
            success: true
        }
    } catch (error) {
        console.log(error)
        return {
            error: true
        }
    }
}