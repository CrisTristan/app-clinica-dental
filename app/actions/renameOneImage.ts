"use server"
import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

export async function renameOneImage(
    publicId: string,
    name: string
): Promise<string> {
    const auth = await requireStaff()
    if (!auth.ok) throw new Error(auth.error)
    if (!publicId.startsWith("pacientes/")) throw new Error("Archivo no válido")

    const trimmed = name.trim()
    if (!trimmed) throw new Error("El nombre no puede estar vacío")

    // Solo actualizamos el nombre visible en la base de datos; el asset de
    // Cloudinary (public_id) no cambia para no invalidar las URLs firmadas.
    const supabase = createAdminClient()
    const { error } = await supabase
        .from("Patient_Files")
        .update({ Name: trimmed })
        .eq("publicId", publicId)

    if (error) {
        throw new Error("No se pudo actualizar el nombre del archivo")
    }

    return trimmed
}
