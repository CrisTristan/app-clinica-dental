"use server"
import {v2 as Cloudinary} from "cloudinary"
import { requireStaff } from "@/lib/auth-guard"
import {createAdminClient} from "@/lib/supabase/admin"

export async function deleteOneImage(
    publicId: string,
    type: "upload" | "private" | "authenticated" = "upload",
    resourceType: "image" | "video" | "raw" = "image"
): Promise<string> {
    const auth = await requireStaff()
    if (!auth.ok) throw new Error(auth.error)
    if (!publicId.startsWith("pacientes/")) throw new Error("Archivo no válido")

    try {
        await Cloudinary.uploader.destroy(publicId, {
            // Los expedientes pueden incluir PDFs, que Cloudinary suele guardar como raw.
            resource_type: resourceType,
            type,
            invalidate: true,
        })
        
    } catch (error) {
        throw new Error("No se pudo borrar la imagen")
    }

    //Borrar también de la base de datos
    const supabase = createAdminClient();
    const { error } = await supabase
        .from("Patient_Files")
        .delete()
        .eq("publicId", publicId);
    if (error) {
        throw new Error("No se pudo borrar el archivo de la base de datos")
    }

    return "imagen borrada"
}
