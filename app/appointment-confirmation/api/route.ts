import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function POST(req: Request) {
    const confirmation = await req.json();

    console.log(confirmation);
    
    const appointment = await prisma.appointment.update({
        where : { 
            id : confirmation.id
        },
        data: {
            status: confirmation.confirmation
        }
    })
    
    return new Response(JSON.stringify(appointment), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 201
    });
}