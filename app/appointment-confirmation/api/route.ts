import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function POST(req: Request) {
    const confirmation = await req.json();

    console.log(confirmation);

    const patient = await prisma.patient.findUnique({
        where : { 
            telefono : confirmation.phoneNumber
        },
        include: {
            Appointment: true
        }
    })
    
    if(patient){
        // appointment.Appointment.map((appointment)=>{
        //     console.log(appointment.id);
        // })

        console.log(patient.Appointment[patient.Appointment.length- 1].id)
        const lastAppointmentId=patient.Appointment[patient.Appointment.length- 1].id;
        try {
            const changeAppoitmentStatus = await prisma.appointment.update({
                where: {
                    id: lastAppointmentId
                },
                data: {
                    status: confirmation.confirmation
                }
            })
            console.log(changeAppoitmentStatus);
            return new Response(JSON.stringify(changeAppoitmentStatus), {
                headers: {
                    "Content-Type": "application/json",
                },
                status: 201
            });
        } catch (error) {
            console.log(error);
        } 

    }
    return new Response(JSON.stringify(patient), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 201
    });
}