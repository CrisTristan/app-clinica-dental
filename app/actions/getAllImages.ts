"use server"
import {v2 as Cloudinary} from "cloudinary"
import { requireStaff } from "@/lib/auth-guard";

export interface PatientFile {
    publicId: string;
    format: string;
    resourceType: "image" | "video" | "raw";
    type: "upload" | "private" | "authenticated";
}

interface CloudinarySearchResource {
    public_id: string;
    format?: string;
    resource_type: PatientFile["resourceType"];
    type: PatientFile["type"];
}

const getAssetFormat = (publicId: string, format?: string) => {
    // En PDFs raw Cloudinary puede dejar el formato en la extension del public_id.
    return format ?? publicId.split(".").pop() ?? "";
}

export async function getAllPatientImages(
    patientName: string | null,
    patientID: string | null
): Promise<PatientFile[]> {
    const auth = await requireStaff();
    if (!auth.ok || !patientName || !patientID) return [];

    const response = await Cloudinary.search.expression(`folder="pacientes/${patientName+"_"+patientID}"`).execute();
    return (response.resources as CloudinarySearchResource[]).map((image) => ({
        publicId: image.public_id,
        format: getAssetFormat(image.public_id, image.format),
        resourceType: image.resource_type,
        type: image.type,
    }));
}

