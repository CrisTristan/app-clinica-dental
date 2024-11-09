"use server"
import { prisma } from "@/prisma";

export const getPatientBudgets = async (id: number)=>{

    try {
        const res = await prisma.patient.findUnique({
            where: {
                id: Number(id)
            },
        })

        console.log(res);
        return res;
    } catch (error) {
        console.log(error);
    }   
}