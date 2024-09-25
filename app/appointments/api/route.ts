import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export async function GET() {
    const Appointments = await prisma.appointments.findMany()
    return Response.json(Appointments)
}

export async function POST(req: Request) {
    const appointment = await req.json();

    await prisma.appointments.create({
        data: {
            id: appointment.id,
            name: appointment.name,
            desc : appointment.description,
            startDate: appointment.startDate,
            endDate: appointment.endDate
        },
    })
    return new Response(JSON.stringify(appointment), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 201
    });
}

export async function PUT(req: Request) {
    const appointment = await req.json();
    const id = appointment.id;

    await prisma.appointments.update({
        where: {
          id: id,
        },
        data: {
            desc : appointment.description,
            startDate: appointment.startDate,
            endDate: appointment.endDate
        },
      })
    return new Response(JSON.stringify(appointment), {
        headers: {
            "Content-Type": "application/json",
        },
        status: 201
    });
}

export async function DELETE(req: Request) {
    const body = await req.json();
    const id = body.id;

    await prisma.appointments.delete({
        where: {
          id: id,
        },
    })
    return new Response("Registro eliminado", {
        headers: {
            "Content-Type": "application/json",
        },
        status: 201
    });


}