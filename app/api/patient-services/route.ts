import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, fullPatientName } from "@/lib/audit"
import { NextRequest } from "next/server"

export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('Patient_Services')
    .select('*, Patient(name, apellido_pat, apellido_mat, telefono)')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((row: any) => ({
    id:            row.id,
    patient_id:    row.patient_id,
    patient_name:  [row.Patient?.name, row.Patient?.apellido_pat, row.Patient?.apellido_mat]
      .filter(Boolean).join(' '),
    patient_phone: row.Patient?.telefono ?? '',
    name:          row.name,
    price:         row.price,
    balance:       row.balance,
    created_at:    row.created_at,
  }))

  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { patient_id, name, price } = await req.json()
  if (!patient_id || !name || !price || price <= 0) {
    return Response.json({ error: "patient_id, name y price son requeridos" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('Patient_Services')
    .insert({ id: Date.now().toString(), patient_id, name, price, balance: price })
    .select('*, Patient(name, apellido_pat, apellido_mat)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, {
    userId:      auth.userId,
    userName:    auth.nombre,
    action:      'crear',
    entity:      'servicio',
    entityId:    data.id,
    patientName: fullPatientName((data as any).Patient),
    serviceName: name,
    details:     { precio: price },
  })

  const { Patient: _patient, ...service } = data as any
  return Response.json(service, { status: 201 })
}
