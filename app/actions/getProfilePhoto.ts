"use server"
import {v2 as Cloudinary} from "cloudinary"

export async function getProfilePhoto(patientName : string): Promise<string>{
    const resources = await Cloudinary.search.expression(`folder="pacientes/${patientName}/fotosPerfil"`).execute();
    const response = resources.resources[0]
    const secure_url = response.secure_url;
    //console.log(secure_url)
    return secure_url  //Url de la foto de perfil
}