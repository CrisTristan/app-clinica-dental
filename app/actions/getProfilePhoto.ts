"use server"
import {v2 as Cloudinary} from "cloudinary"
import {createAdminClient} from "@/lib/supabase/admin";
import type {PatientFile} from "../actions/getAllImages"

export async function getProfilePhoto(patientName : string | null, patientID : string | null): Promise<PatientFile>{
    //Antes se buscaba la foto directamente en cloudinary
    // const resources = await Cloudinary.search.expression(`folder="pacientes/${patientID}/fotoPerfil"`).execute();
    // const response = resources.resources[0]
    // const secure_url = response?.secure_url as string | undefined;
    // return secure_url  //Url de la foto de perfil (undefined si el paciente no tiene)

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("Patient_Files")
        .select("publicId, format, resourceType, type")
        .eq("patient_id", patientID)
        .eq("kind", "profile_photo")
        .single();

    if (error) {
        console.error("Error fetching profile photo from database:", error);
        return {
            publicId: "",
            format: "",
            resourceType: "image",
            type: "authenticated"
        }
    }

    return {
        publicId: data.publicId,
        format: data.format,
        resourceType: data.resourceType,
        type: data.type
    }
}