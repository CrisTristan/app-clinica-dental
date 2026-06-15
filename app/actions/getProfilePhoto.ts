"use server"
import {v2 as Cloudinary} from "cloudinary"

export async function getProfilePhoto(patientName : string | null, patientID : string | null): Promise<string | undefined>{
    const resources = await Cloudinary.search.expression(`folder="pacientes/${patientName+"_"+patientID}/fotoPerfil"`).execute();
    const response = resources.resources[0]
    const secure_url = response?.secure_url as string | undefined;
    return secure_url  //Url de la foto de perfil (undefined si el paciente no tiene)
}