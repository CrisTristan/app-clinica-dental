import { NextRequest } from "next/server"

import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

const SETTINGS_ID = "global"

type SettingsRow = {
  id?: string | null
  logo_url?: string | null
  clinic_name?: string | null
  clinic_address?: string | null
  clinic_phone?: string | null
  orientation?: string | null
}

function toClientSettings(row?: SettingsRow | null) {
  return {
    logoUrl: row?.logo_url ?? "",
    clinicName: row?.clinic_name ?? "",
    clinicAddress: row?.clinic_address ?? "",
    clinicPhone: row?.clinic_phone ?? "",
    orientation: row?.orientation === "vertical" ? "vertical" : "horizontal",
  }
}

export async function GET() {
  const auth = await requireRole(rolesFor("recetas"))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("prescription_settings")
    .select("id, logo_url, clinic_name, clinic_address, clinic_phone, orientation")
    .eq("id", SETTINGS_ID)
    .maybeSingle()

  if (error) {
    if (error.code === "42P01" || error.message.includes("prescription_settings")) {
      return Response.json({ settings: toClientSettings(null) })
    }
    if (error.code === "42703") {
      const fallback = await supabase
        .from("prescription_settings")
        .select("id, logo_url, clinic_address")
        .eq("id", SETTINGS_ID)
        .maybeSingle()

      if (fallback.error) {
        return Response.json({ error: fallback.error.message }, { status: 500 })
      }

      return Response.json({ settings: toClientSettings(fallback.data) })
    }
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ settings: toClientSettings(data) })
}

export async function PUT(request: NextRequest) {
  const auth = await requireRole(rolesFor("recetas"))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : ""
  const clinicName = typeof body.clinicName === "string" ? body.clinicName.trim() : ""
  const clinicAddress = typeof body.clinicAddress === "string" ? body.clinicAddress.trim() : ""
  const clinicPhone = typeof body.clinicPhone === "string" ? body.clinicPhone.trim() : ""
  const orientation = body.orientation === "vertical" ? "vertical" : "horizontal"

  if (!clinicAddress) {
    return Response.json({ error: "El domicilio de la clinica es obligatorio." }, { status: 400 })
  }
  if (logoUrl.length > 2_100_000) {
    return Response.json({ error: "El logo excede el tamano permitido." }, { status: 413 })
  }
  if (logoUrl && !logoUrl.startsWith("data:image/")) {
    return Response.json({ error: "El formato del logo no es valido." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("prescription_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        logo_url: logoUrl || null,
        clinic_name: clinicName || null,
        clinic_address: clinicAddress,
        clinic_phone: clinicPhone || null,
        orientation,
        updated_by: auth.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id, logo_url, clinic_name, clinic_address, clinic_phone, orientation")
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ settings: toClientSettings(data) })
}
