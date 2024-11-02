"use server"
import {v2 as Cloudinary} from "cloudinary"
import { fileURLToPath } from "url"

export async function deleteAddversitesment(url: string) : Promise<string>{
    const urls = url.split("/anuncios/")
    const noPrefix = urls[1].split(".")
    const FilePathtoDelete = "anuncios/".concat(noPrefix[0])
    let FilePathtoDeleteWithSpace : string
    let response;
    console.log(url)
    try {
        Cloudinary.uploader.destroy(FilePathtoDelete)
        .then(res=>{console.log(res); response=res.result} )
        return ''+response;
    } catch (error) {
        throw new Error ("No se pudo borrar la imagen")
    }
    
}