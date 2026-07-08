"use server"
import {v2 as Cloudinary} from "cloudinary"
import { requireStaff } from "@/lib/auth-guard";
import {createAdminClient} from "@/lib/supabase/admin"

export interface PatientFile {
    publicId: string;
    format: string;
    resourceType: "image" | "video" | "raw";
    type: "upload" | "private" | "authenticated";
    Name?: string | null;
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

    //Antes se buscaban las imagenes desde cloudinary
    // const response = await Cloudinary.search.expression(`folder="pacientes/${patientID}/archivos"`).execute();
    // return (response.resources as CloudinarySearchResource[]).map((image) => ({
    //     publicId: image.public_id,
    //     format: getAssetFormat(image.public_id, image.format),
    //     resourceType: image.resource_type,
    //     type: image.type,
    // }));

    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from("Patient_Files")
        .select("publicId, format, resourceType, type, Name")
        .eq("patient_id", patientID)
        .eq("kind", "clinical_file")
        .select();

    if (error) {
        console.error("Error fetching profile photo from database:", error);
        return []
    }

    return data as PatientFile[];
}

