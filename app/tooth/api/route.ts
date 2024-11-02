import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function GET(req : Request){
    const { searchParams } = new URL(req.url)
    const id = Number.parseInt(searchParams.get('id'))

    console.log(id);
    if(id){
        const teeth = await prisma.teeth.findUnique({
            where: {
                nameId: id
            }
        })

        return Response.json(teeth);
    }
}

export async function POST(req : Request){

    const {teethState, id} = await req.json();
    //console.log(teethState);
    console.log(id)
    let searchForTeeth;
    try {
        //buscar si existe el paciente;
        searchForTeeth = await prisma.teeth.findUnique({
            where: {
                nameId: Number(id)
            }
        })

        if(searchForTeeth){
            await prisma.teeth.update({
                where: {
                    nameId: Number(id)
                },
                data : {
                    teethState: teethState
                }
            })
            return Response.json({"teeth updated":searchForTeeth});
        }
        
    } catch (error) {
        console.log(error);
        //console.log(`teeth for id ${id} not found`);
    }

    try {
        if(!searchForTeeth){
        const PatietTeeth = await prisma.teeth.create({
            data: {
                teethState: teethState,
                name : {
                    connect: {
                        id: Number(id)
                    }
                } 
            }
        })

        console.log(PatietTeeth);
        }
    } catch (error) {
        console.log(error);
    }

    return Response.json("Saving Teeth");
}