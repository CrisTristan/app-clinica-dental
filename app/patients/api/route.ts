import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request : Request){
    const { searchParams } = new URL(request.url)
    const id = Number.parseInt(searchParams.get('id'))

    if(id){
        const Patient = await prisma.patient.findUnique({
            where: {
                id: id
            }
        })

        return Response.json(Patient);
    }
    
    const Patients = await prisma.patient.findMany({
        include: {
            Appointment: true
        }
    });
    return Response.json(Patients);
}

export async function POST(req : Request){

    const body = await req.json();
    const Patient = await prisma.patient.create({
        data : {
            name: body.name,
            telefono: body.phone
        }
    })
    return Response.json(Patient);
}