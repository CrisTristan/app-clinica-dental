import { NextRequest } from "next/server"
import { v2 as Cloudinary } from "cloudinary";
import { createAdminClient } from "@/lib/supabase/admin";


Cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryResponse {
    publicId: string;
    assetId: string;
    format?: string;
    resourceType: "image" | "video" | "raw";
    type: "upload" | "private" | "authenticated";
    bytes: number;
    displayName: string;
}

const getAssetFormat = (publicId: string, format?: string) => {
    // Los PDFs raw pueden traer el formato solo como extension del public_id.
    return format ?? publicId.split(".").pop() ?? "";
};

const extractPatientIdFromUrl = (url: string): number => {
    // Extraemos el ID del paciente de la URL
    const url_ = new URL(url);
    const pathSegments = url_.pathname.split("/");
    const patientId = pathSegments[pathSegments.indexOf("patients") + 1];
    return parseInt(patientId, 10);
};

const ALLOWED_TYPES = new Set(["upload", "private", "authenticated"]);
const ALLOWED_RESOURCE_TYPES = new Set(["image", "video", "raw"]);

// Este endpoint se encarga de obtener los archivos de un paciente, pero por ahora solo devuelve un mensaje con el ID del paciente.
export async function GET(request: NextRequest) {
    const patientId = extractPatientIdFromUrl(request.url);

    return new Response("Endpoint para obtener los archivos de un paciente con ID: " + patientId)
}

// Este endpoint se encarga de restringir un asset de Cloudinary, cambiando su tipo a "authenticated" para que solo pueda ser accedido mediante URLs firmadas.
export async function POST(request: Request) {

    const kindFile = new URL(request.url).searchParams.get("kind");

    // if (kindFile !== "profile_photo" && kindFile !== "clinical_file") {
    //     return Response.json(
    //         { error: "Tipo de archivo no válido" },
    //         { status: 400 }
    //     );
    // }

    const body = await request.json();
    const { public_id, resource_type = "image", type = "upload", name } = body;

    // Nombre legible que eligio el usuario al subir el archivo. Si por algun
    // motivo no llega, se usa el display_name que devuelva Cloudinary.
    const originalName = typeof name === "string" && name.trim() ? name.trim() : null;

    if (
        typeof public_id !== "string" ||
        !ALLOWED_TYPES.has(type) ||
        !ALLOWED_RESOURCE_TYPES.has(resource_type)
    ) {
        return Response.json(
            { error: "Archivo no válido" },
            { status: 400 }
        );
    }

    //Restringimos el asset cambiando su tipo a "authenticated". Esto hace que el asset solo pueda ser accedido mediante URLs firmadas, 
    // lo cual es más seguro para archivos sensibles.
    try {
        const result: CloudinaryResponse = await Cloudinary.uploader.rename(public_id, public_id, {
            resource_type,
            type,
            to_type: "authenticated",
            overwrite: true,
            invalidate: true,
        }).then(result => {
            console.log("Asset restringido exitosamente:", result);
            return {
                publicId: result.public_id,
                assetId: result.asset_id,
                format: getAssetFormat(result.public_id, result.format),
                resourceType: result.resource_type,
                type: result.type,
                bytes: result.bytes,
                displayName: result.display_name,
            }
        }).catch(error => {
            console.error("Error al restringir el asset:", error);
            throw new Error("Archivo restringido pero no se pudo actualizar en Cloudinary");
        });

        const fileName = originalName ?? result.displayName;

        //Guardar el resultado en la base de datos
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("Patient_Files")
            .insert({
                patient_id: extractPatientIdFromUrl(request.url),
                publicId: result.publicId,
                assetId: result.assetId,
                format: result.format,
                resourceType: result.resourceType,
                type: result.type,
                kind: kindFile,
                bytes: result.bytes,
                Name: fileName,
            })
            .select()
            .single();

        if (error) {
            console.error("Error al guardar el asset en la base de datos:", error);
            throw new Error("Archivo restringido pero no se pudo guardar en la base de datos");
        }

        return Response.json({
            ok: true,
            asset: { ...result, Name: fileName },
        });
    } catch (error) {
        return Response.json(
            { error: error instanceof Error ? error.message : "Error desconocido" },
            { status: 500 }
        );
    }



}