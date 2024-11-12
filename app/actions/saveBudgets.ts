"use server"
import { prisma } from "@/prisma"

export const savePatientBudgets = async (id: number, budgets)=>{
    console.log("servicios",budgets)
    try {
        const res = await prisma.patient.update({
            where: {
                id: Number(id)
            },
            data: {
                servicios: budgets
            }
        })

        console.log(res);
        return res;
    } catch (error) {
        console.log(error);
    }   
}