import { NextRequest } from "next/server"

import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

const fields = [
  "logoUrl",
  "doctorFirstName",
  "doctorLastName",
  "doctorSecondLastName",
  "degreeInstitution",
  "professionalLicense",
  "specialty",
  "clinicAddress",
  "signatureDataUrl",
] as const

function canManageTemplate(role: string) {
  return role === "admin" || role === "dentista"
}

function toClientTemplate(row: Record<string, string | null>, isOwn = false) {
  return {
    id: row.id ?? "",
    isOwn,
    logoUrl: row.logo_url ?? "",
    doctorFirstName: row.doctor_first_name ?? "",
    doctorLastName: row.doctor_last_name ?? "",
    doctorSecondLastName: row.doctor_second_last_name ?? "",
    degreeInstitution: row.degree_institution ?? "",
    professionalLicense: row.professional_license ?? "",
    specialty: row.specialty ?? "",
    clinicAddress: row.clinic_address ?? "",
    signatureDataUrl: row.signature_data_url ?? "",
  }
}

export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })
  if (!canManageTemplate(auth.role)) {
    return Response.json({ error: "Solo los dentistas pueden administrar plantillas." }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("prescription_templates")
    .select("*")
    .order("doctor_last_name", { ascending: true })
    .order("doctor_first_name", { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const templates = data.map((row) =>
    toClientTemplate(row, row.dentist_id === auth.userId)
  )

  return Response.json({
    templates,
    template: templates.find((template) => template.isOwn) ?? null,
  })
}

export async function PUT(request: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })
  if (!canManageTemplate(auth.role)) {
    return Response.json({ error: "Solo los dentistas pueden administrar plantillas." }, { status: 403 })
  }

  const body = await request.json()
  const values = Object.fromEntries(
    fields.map((field) => [field, typeof body[field] === "string" ? body[field].trim() : ""])
  ) as Record<(typeof fields)[number], string>

  if (
    !values.doctorFirstName ||
    !values.doctorLastName ||
    !values.degreeInstitution ||
    !values.professionalLicense ||
    !values.clinicAddress
  ) {
    return Response.json({ error: "Faltan datos obligatorios de la plantilla." }, { status: 400 })
  }
  if (values.logoUrl.length > 2_100_000 || values.signatureDataUrl.length > 600_000) {
    return Response.json({ error: "El logo o la firma exceden el tamaño permitido." }, { status: 413 })
  }
  if (values.logoUrl && !values.logoUrl.startsWith("data:image/")) {
    return Response.json({ error: "El formato del logo no es válido." }, { status: 400 })
  }
  if (values.signatureDataUrl && !values.signatureDataUrl.startsWith("data:image/png")) {
    return Response.json({ error: "El formato de la firma no es válido." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("prescription_templates")
    .upsert(
      {
        dentist_id: auth.userId,
        logo_url: values.logoUrl || null,
        doctor_first_name: values.doctorFirstName,
        doctor_last_name: values.doctorLastName,
        doctor_second_last_name: values.doctorSecondLastName || null,
        degree_institution: values.degreeInstitution,
        professional_license: values.professionalLicense,
        specialty: values.specialty || null,
        clinic_address: values.clinicAddress,
        signature_data_url: values.signatureDataUrl || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dentist_id" }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ template: toClientTemplate(data, true) })
}
