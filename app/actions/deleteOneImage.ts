"use server"
import { v2 as Cloudinary } from "cloudinary"
import { requireStaff } from "@/lib/auth-guard"

export async function deleteOneImage(url: string): Promise<string> {
    // Borra un archivo de paciente: exige sesión de personal.
    const auth = await requireStaff()
    if (!auth.ok) throw new Error(auth.error)

    const urls = url.split("/pacientes/")
    const noPrefix = urls[1].split(".")
    const FilePathtoDelete = "pacientes/".concat(noPrefix[0])
    const FilePathtoDeleteWithSpace = FilePathtoDelete.includes("%20")
        ? FilePathtoDelete.replace("%20", " ")
        : FilePathtoDelete

    try {
        await Cloudinary.uploader.destroy(FilePathtoDeleteWithSpace)
        return "imagen borrada"
    } catch (error) {
        throw new Error("No se pudo borrar la imagen")
    }
}
