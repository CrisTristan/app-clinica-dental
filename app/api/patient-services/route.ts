import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
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
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}
