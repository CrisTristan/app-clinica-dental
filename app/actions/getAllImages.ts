"use server"
import {v2 as Cloudinary} from "cloudinary"
import { ImageFormat } from "../types/types";

export async function getAllPatientImages(patientName : string, patientID : number): Promise<string[]>{
    const response = await Cloudinary.search.expression(`folder="pacientes/${patientName+"_"+patientID}"`).execute();
    const resources = response.resources;
    console.log(resources)
    const images : string[] = [];
    resources.map((image: ImageFormat) =>{
        images.push(image.secure_url);
    })

    return images;
}

