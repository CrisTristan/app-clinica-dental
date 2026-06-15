"use server"
import { v2 as Cloudinary } from "cloudinary"
import { requireAdmin } from "@/lib/auth-guard"

export async function deleteAddversitesment(url: string): Promise<string> {
    // Los anuncios solo los gestiona el administrador.
    const auth = await requireAdmin()
    if (!auth.ok) throw new Error(auth.error)

    const urls = url.split("/anuncios/")
    const noPrefix = urls[1].split(".")
    const FilePathtoDelete = "anuncios/".concat(noPrefix[0])

    try {
        const res = await Cloudinary.uploader.destroy(FilePathtoDelete)
        return res.result
    } catch (error) {
        throw new Error("No se pudo borrar la imagen")
    }
}
