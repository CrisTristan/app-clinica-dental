import { db } from "@/lib/db";

export async function GET(request : Request){

    const {searchParams} = new URL(request.url);
    const patientId = Number.parseInt(searchParams.get('id'));
    console.log(patientId);
    try {
        const dentalData = await db.dentalData.findUnique({
            where: {
                nameId: patientId
            }
        })
    
        return Response.json(dentalData);
    } catch (error) {
        console.log(error);
        return Response.json(error);
    }
    
}

export async function PUT(response: Response){

    const {examenTejidos, motivoConsulta, habitos, enfermedadesPersonales, higieneBucal, alergias, alimentacion, id} = await response.json()
    console.log(motivoConsulta, id);
    try {
        const Patientid = await db.dentalData.findUnique({
            where: {
                nameId: Number(id)
            }
        })


        if(Patientid){ //si existe el nameId (id de un paciente )
            const dentalData = await db.dentalData.update({ //actualizamos
                where:{
                    nameId: Number(id),
                },
                data: {
                    motivoConsulta: motivoConsulta,
                    examenTejidos: examenTejidos,
                    habitos: habitos,
                    enfermedadesPersonales: enfermedadesPersonales,
                    higieneBucal: higieneBucal,
                    alergias: alergias,
                    alimentacion: alimentacion
                }  
            })

            return Response.json(dentalData);
        }else {
            const createPatientData = await db.dentalData.create({  //creamos
                data: {
                    motivoConsulta: motivoConsulta,
                    examenTejidos: examenTejidos,
                    habitos: habitos,
                    enfermedadesPersonales: enfermedadesPersonales,
                    higieneBucal: higieneBucal,
                    alergias: alergias,
                    alimentacion: alimentacion,
                    nameId: Number(id)
                }
            })

            return Response.json(createPatientData);
        }

    } catch (error) {
        console.log(error)
       return Response.json(error);   
    }
    
}