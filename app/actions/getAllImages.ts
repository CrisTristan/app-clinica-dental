"use server"
import {v2 as Cloudinary} from "cloudinary"
import { ImageFormat } from "../types/types";

export async function getAllPatientImages(patientName : string | null, patientID : string | null): Promise<string[]>{
    const response = await Cloudinary.search.expression(`folder="pacientes/${patientName+"_"+patientID}"`).execute();
    const resources = response.resources;
    const images : string[] = [];
    resources.map((image: ImageFormat) =>{
        if (image.secure_url) images.push(image.secure_url);
    })

    return images;
}

