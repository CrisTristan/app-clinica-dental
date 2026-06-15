"use server"
import {v2 as Cloudinary} from "cloudinary"
import { ImageFormat } from "../types/types";

export async function getAllAddvertisements(): Promise<ImageFormat[]>{
    const response = await Cloudinary.search.expression('folder="anuncios"').execute();
    const resources = response.resources;
    const images : ImageFormat[] = [];
    resources.map((image: ImageFormat) =>{
        if (image.secure_url) images.push({url: image.secure_url, width: image.width, height: image.height});
    })

    return images;
}