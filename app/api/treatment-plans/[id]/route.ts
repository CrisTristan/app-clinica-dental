import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Estados válidos del plan de tratamiento (enum de la BD).
const STATUSES = ["draft", "authorized", "unauthorized", "in_progress", "completed", "cancelled"] as const
type Status = (typeof STATUSES)[number]

const fullPatientName = (p: { nombre?: string | null; apellido_pat?: string | null; apellido_mat?: string | null } | null) =>
  [p?.nombre, p?.apellido_pat, p?.apellido_mat].filter(Boolean).join(" ").trim() || null

// Detalle de un plan de tratamiento para el formulario de "Tratamientos activos".
// Resuelve tratamiento (dental_treatments), paciente (Patient) y dentista
// (profiles), e incluye la lista de dentistas para el selector editable.
//
//   GET /api/treatment-plans/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const planId = Number((await params).id)
  if (!planId) return Response.json({ error: "Plan inválido" }, { status: 400 })

  const supabase = createAdminClient()

  const { data: plan, error } = await supabase
    .from("treatment_plans")
    .select("id, treatment_id, patient_id, dentist_id, status, created_at, authorized_at, total, observaciones")
    .eq("id", planId)
    .single()

  if (error) return Response.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 })

  const [{ data: treatment }, { data: patient }, { data: dentists }] = await Promise.all([
    plan.treatment_id
      ? supabase.from("dental_treatments").select("nombre").eq("id", plan.treatment_id).maybeSingle()
      : Promise.resolve({ data: null }),
    plan.patient_id
      ? supabase.from("Patient").select("nombre, apellido_pat, apellido_mat").eq("id", plan.patient_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, nombre").eq("role", "dentista").order("nombre", { ascending: true }),
  ])

  const dentistList = dentists ?? []
  const dentista = dentistList.find(d => d.id === plan.dentist_id)?.nombre ?? null

  // Procedimientos del plan: cantidad y precio viven en treatment_plan_procedures;
  // el nombre en clinic_procedures. Se resuelve con una búsqueda aparte.
  const { data: tpp } = await supabase
    .from("treatment_plan_procedures")
    .select("id, clinic_procedure_id, cantidad, precio_unitario, status")
    .eq("treatment_plan_id", planId)
    .order("clinic_procedure_id", { ascending: true })

  const clinicIds = [...new Set((tpp ?? []).map(r => r.clinic_procedure_id).filter(Boolean))]
  const { data: clinicProcs } = clinicIds.length
    ? await supabase.from("clinic_procedures").select("id, nombre").in("id", clinicIds)
    : { data: [] as { id: number; nombre: string }[] }

  const nameMap = new Map((clinicProcs ?? []).map(c => [c.id, c.nombre]))

  const procedures = (tpp ?? []).map(r => ({
    id: r.id,
    clinic_procedure_id: r.clinic_procedure_id,
    nombre: nameMap.get(r.clinic_procedure_id) ?? "Procedimiento",
    cantidad: r.cantidad,
    precio: r.precio_unitario,
    status: r.status,
  }))

  // ¿El plan ya tiene una hoja de consentimiento? (consents.treatment_plan_id es unique)
  const { data: consent } = await supabase
    .from("consents")
    .select("id")
    .eq("treatment_plan_id", planId)
    .maybeSingle()

  return Response.json({
    plan: {
      id: plan.id,
      nombre: treatment?.nombre ?? "Tratamiento",
      paciente: fullPatientName(patient),
      dentist_id: plan.dentist_id,
      dentista,
      status: plan.status,
      created_at: plan.created_at,
      authorized_at: plan.authorized_at,
      total: plan.total,
      observaciones: plan.observaciones,
      has_consent: !!consent,
      procedures,
    },
    dentists: dentistList,
  })
}

// Edita los campos editables del plan: estado, dentista responsable y observaciones.
//
//   PATCH /api/treatment-plans/:id
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const planId = Number((await params).id)
  if (!planId) return Response.json({ error: "Plan inválido" }, { status: 400 })

  let body: {
    status?: string
    dentist_id?: string | null
    observaciones?: string | null
    authorized_at?: string | null
    generar_consentimiento?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as Status)) {
      return Response.json({ error: "Estado inválido" }, { status: 400 })
    }
    updates.status = body.status
  }
  if (body.dentist_id !== undefined) {
    updates.dentist_id = body.dentist_id || null
  }
  if (body.authorized_at !== undefined) {
    const fecha = body.authorized_at?.trim()
    if (fecha && isNaN(new Date(fecha).getTime())) {
      return Response.json({ error: "Fecha de autorización inválida" }, { status: 400 })
    }
    updates.authorized_at = fecha ? fecha : null
  }
  if (body.observaciones !== undefined) {
    const obs = body.observaciones?.trim()
    updates.observaciones = obs ? obs : null
  }

  const wantsConsent = body.generar_consentimiento === true

  if (Object.keys(updates).length === 0 && !wantsConsent) {
    return Response.json({ error: "Sin cambios" }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("treatment_plans").update(updates).eq("id", planId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  // Genera la hoja de consentimiento solo si se pidió y aún no existe una
  // (consents.treatment_plan_id es unique → un único registro por plan).
  let hasConsent = false
  if (wantsConsent) {
    const { data: existing } = await supabase
      .from("consents")
      .select("id")
      .eq("treatment_plan_id", planId)
      .maybeSingle()

    if (existing) {
      hasConsent = true
    } else {
      const { data: plan } = await supabase
        .from("treatment_plans")
        .select("patient_id")
        .eq("id", planId)
        .single()

      const { error } = await supabase
        .from("consents")
        .insert({ treatment_plan_id: planId, patient_id: plan?.patient_id })

      if (error) return Response.json({ error: error.message }, { status: 500 })
      hasConsent = true
    }
  }

  return Response.json({ ok: true, has_consent: hasConsent })
}
