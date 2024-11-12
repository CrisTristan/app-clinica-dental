import { Patient } from "@/app/types/types";
import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

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
            telefono: body.phone,
            apellido_pat: body.apellidoPat,
            apellido_mat: body.apellidoMat,
        }
    })
    return Response.json(Patient);
}

export async function PUT(req : Request){

    const {id, name, apellido_pat, apellido_mat, telefono, edad, domicilio, sexo} : Patient = await req.json();
    //console.log(sexo);
    const Patient = await prisma.patient.update({
        where: {
            id
        }, 
        data: {
            name,
            apellido_pat,
            apellido_mat,
            telefono,
            edad: Number(edad),
            domicilio,
            sexo: sexo,
        }
    })
    return Response.json(Patient);
}

export async function DELETE(req : Request){

    const body = await req.json();
    const Ids = body.ids;
    console.log(Ids);
    let Patient;
    Ids.forEach(async id => {
        Patient = await prisma.patient.delete({
            where: {id: parseInt(id)}
        })
    });
    return Response.json({message: "Paciente Borrados"});
}