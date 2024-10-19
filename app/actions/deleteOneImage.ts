"use server"
import {v2 as Cloudinary} from "cloudinary"
import { fileURLToPath } from "url"

export async function deleteOneImage(url: string) : Promise<string>{
    const urls = url.split("/pacientes/")
    const noPrefix = urls[1].split(".")
    const FilePathtoDelete = "pacientes/".concat(noPrefix[0])
    let FilePathtoDeleteWithSpace : string
    if(FilePathtoDelete.includes("%20")){
        FilePathtoDeleteWithSpace = FilePathtoDelete.replace("%20", " ")
    }else {
        FilePathtoDeleteWithSpace = FilePathtoDelete;
    }
    console.log(FilePathtoDeleteWithSpace)
    try {
        Cloudinary.uploader.destroy(FilePathtoDeleteWithSpace)
        .then(res=> console.log(res))
        return "borrada"
    } catch (error) {
        return "Hubo un error al borrar la imagen"
    }
    
}