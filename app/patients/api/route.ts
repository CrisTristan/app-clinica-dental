import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(){
    
    return Response.json("Hola");
}

export async function POST(){
    return Response.json("Post");
}