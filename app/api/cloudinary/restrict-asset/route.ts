import { v2 as Cloudinary } from "cloudinary";
import { requireStaff } from "@/lib/auth-guard";

const ALLOWED_TYPES = new Set(["upload", "private", "authenticated"]);
const ALLOWED_RESOURCE_TYPES = new Set(["image", "video", "raw"]);

Cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const auth = await requireStaff();

  if (!auth.ok) {
    return Response.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const body = await request.json();
  const { public_id, resource_type = "image", type = "upload" } = body;

  if (
    typeof public_id !== "string" ||
    !public_id.startsWith("pacientes/") ||
    !ALLOWED_TYPES.has(type) ||
    !ALLOWED_RESOURCE_TYPES.has(resource_type)
  ) {
    return Response.json(
      { error: "Archivo no válido" },
      { status: 400 }
    );
  }

  try {
    const result = await Cloudinary.uploader.rename(public_id, public_id, {
      resource_type,
      type,
      to_type: "authenticated",
      overwrite: true,
      invalidate: true,
    });

    return Response.json({
      ok: true,
      asset: {
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        type: result.type,
      },
    });
  } catch (error) {
    console.error("Error restringiendo asset:", error);

    return Response.json(
      { error: "No se pudo restringir el archivo" },
      { status: 500 }
    );
  }
}
