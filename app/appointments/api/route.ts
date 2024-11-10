import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// export async function GET() {
//     const Appointments = await prisma.appointment.findMany({
//         include: {
//             name: true,
//         }
//     })
//     return Response.json(Appointments)
// }

export async function GET(req: Request) { 
    // Parseamos la URL para extraer los parámetros de consulta
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');

    if (!startDate) {
        const Appointments = await prisma.appointment.findMany({
                    include: {
                        name: true,
                    }
                })
                return Response.json(Appointments)
    }

    console.log(startDate);
    try {
        const Appointments = await prisma.appointment.findMany({
            include: { name: true },
            where: {
                startDate: {
                    gte: new Date(startDate)
                }
            },
            take: 7
        });
        console.log(Appointments);
        return Response.json(Appointments);
    } catch (error) {
        console.log(error);
        return new Response('Server error', { status: 500 });
    }
}



export async function POST(req: Request) {
    const appointment = await req.json();

    const patient = await prisma.patient.findUnique({
        where : { 
            telefono : appointment.phone
        },
        select: {
            id: true
        }
    })

    if(patient){
        await prisma.appointment.create({
            data: {
                id: appointment.id,
                name: {
                    connect: {
                      id: patient.id
                    }
                },
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

    await prisma.appointment.create({
        data: {
            id: appointment.id,
            name: {
                create: {
                  name: appointment.name,
                  telefono: appointment.phone,
                }
            },
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

    await prisma.appointment.update({
        where: {
          id: id,
        },
        data: {
            name : {
                connect: {
                    telefono: appointment.phone
                }
            },
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

    await prisma.appointment.delete({
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