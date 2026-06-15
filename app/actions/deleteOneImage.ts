"use server"
import {v2 as Cloudinary} from "cloudinary"
import { requireStaff } from "@/lib/auth-guard"

export async function deleteOneImage(
    publicId: string,
    type: "upload" | "private" | "authenticated" = "upload"
): Promise<string> {
    const auth = await requireStaff()
    if (!auth.ok) throw new Error(auth.error)
    if (!publicId.startsWith("pacientes/")) throw new Error("Archivo no válido")

    try {
        await Cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            type,
            invalidate: true,
        })
        return "imagen borrada"
    } catch (error) {
        throw new Error("No se pudo borrar la imagen")
    }
}
