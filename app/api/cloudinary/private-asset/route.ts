/*
Este endpoint genera URLs firmadas para acceder a archivos privados en Cloudinary. Solo permite acceder a archivos 
que comienzan con "pacientes/" y valida los parámetros de entrada para garantizar la seguridad. El acceso está 
restringido al personal autorizado mediante un guardia de autenticación. Las URLs generadas expiran después de 5 minutos 
para minimizar riesgos de seguridad.
*/
import { v2 as Cloudinary } from "cloudinary";
import { requireStaff } from "@/lib/auth-guard";

Cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_TYPES = new Set(["upload", "private", "authenticated"]);
const ALLOWED_RESOURCE_TYPES = new Set(["image", "video", "raw"]);

export async function GET(request: Request) {
  const auth = await requireStaff();
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const params = new URL(request.url).searchParams;
  const publicId = params.get("public_id");
  const format = params.get("format");
  const type = params.get("type") ?? "authenticated";
  const resourceType = params.get("resource_type") ?? "image";

  if (
    !publicId?.startsWith("pacientes/") ||
    !format ||
    !/^[a-z0-9]+$/i.test(format) ||
    !ALLOWED_TYPES.has(type) ||
    !ALLOWED_RESOURCE_TYPES.has(resourceType)
  ) {
    return Response.json({ error: "Archivo no válido" }, { status: 400 });
  }

  const signedUrl = Cloudinary.utils.private_download_url(publicId, format, {
    resource_type: resourceType as "image" | "video" | "raw",
    type: type as "upload" | "private" | "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    attachment: false,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: signedUrl,
      "Cache-Control": "private, no-store",
    },
  });
}
