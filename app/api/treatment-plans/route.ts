import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Un procedimiento tal como lo arma el odontólogo en el modal "Nuevo tratamiento".
type ProcedureInput = {
  nombre: string
  // Clave del catálogo dental_procedures; en procedimientos propios es sintética.
  catalog_key: string
  custom?: boolean
  cantidad: number
  precio?: string | null
}

type Body = {
  patientId: number
  treatmentId: number
  total: number
  generarConsentimiento: boolean
  procedures: ProcedureInput[]
}

// Crea un plan de tratamiento completo de forma atómica delegando en la función
// de Postgres `create_treatment_plan` (ver supabase/create_treatment_plan.sql),
// que en una sola transacción:
//   1. Inserta los procedimientos en clinic_procedures (dental_procedure_id
//      apunta al catálogo cuando no es propio; el resto queda en NULL).
//   2. Crea el treatment_plans con treatment_id, patient_id, dentist_id y total.
//   3. Enlaza cada procedimiento en treatment_plan_procedures con su cantidad
//      y precio_unitario.
//   4. Si se pidió, genera la hoja de consentimiento en consents.
//
//   POST /api/treatment-plans
export async function POST(request: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  let body: Body
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 })
  }

  const { patientId, treatmentId, total, generarConsentimiento, procedures } = body

  if (!patientId || !treatmentId) {
    return Response.json({ error: "Falta paciente o tratamiento" }, { status: 400 })
  }
  if (!Array.isArray(procedures) || procedures.length === 0) {
    return Response.json({ error: "Sin procedimientos" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc("create_treatment_plan", {
    p_patient_id: patientId,
    p_treatment_id: treatmentId,
    p_dentist_id: auth.userId,
    p_total: total,
    p_generar_consentimiento: generarConsentimiento,
    p_procedures: procedures.map(p => ({
      nombre: p.nombre,
      catalog_key: p.catalog_key,
      custom: p.custom ?? false,
      cantidad: p.cantidad,
      precio: p.precio ?? null,
    })),
  })

  if (error) {
    return Response.json(
      { error: `No se pudo guardar el plan de tratamiento: ${error.message}` },
      { status: 500 },
    )
  }

  return Response.json({ ok: true, treatmentPlanId: data })
}
