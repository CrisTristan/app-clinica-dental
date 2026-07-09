import { requireStaff, requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

// Detalles del paciente (CURP, entidad de nacimiento, nacionalidad, estado,
// municipio y localidad). Solo se almacenan las claves de los catálogos
// (edonac/edo = catalog_key, nacorigen = codigo_pais, mun = catalog_key).
export async function GET(request: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const patientId = Number.parseInt(searchParams.get('id') ?? '')

  if (!Number.isInteger(patientId)) {
    return Response.json({ error: 'id inválido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('patient_details')
    .select('*')
    .eq('patient_id', patientId)
    .single()

  // PGRST116 = no hay fila todavía; es un caso válido (aún sin capturar).
  if (error && error.code !== 'PGRST116') {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data ?? null)
}

export async function PUT(req: Request) {
  const auth = await requireRole(rolesFor('pacientes'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const body = await req.json()
  const patientId = Number(body.patient_id ?? body.id)

  if (!Number.isInteger(patientId)) {
    return Response.json({ error: 'patient_id inválido' }, { status: 400 })
  }

  // Normaliza: cadenas vacías → null; nacorigen es numérico (codigo_pais).
  const clean = (v: unknown) =>
    v === '' || v === undefined ? null : v

  const row = {
    patient_id: patientId,
    curp: clean(body.curp),
    edonac: clean(body.edonac),
    nacorigen: body.nacorigen === '' || body.nacorigen == null ? null : Number(body.nacorigen),
    edo: clean(body.edo),
    mun: clean(body.mun),
    loc: clean(body.loc),
  }

  const { data, error } = await supabase
    .from('patient_details')
    .upsert(row, { onConflict: 'patient_id' })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
