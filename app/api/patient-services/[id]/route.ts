import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, fullPatientName } from "@/lib/audit"
import { NextRequest } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { name, price } = await req.json()
  if (!name || !price || price <= 0) {
    return Response.json({ error: "name y price válidos son requeridos" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const [{ data: payments }, { data: before }] = await Promise.all([
    supabase.from('Payment_History').select('abono').eq('patient_service_id', id),
    supabase.from('Patient_Services')
      .select('name, price, Patient(name, apellido_pat, apellido_mat)')
      .eq('id', id).single(),
  ])

  const totalPaid  = (payments ?? []).reduce((sum: number, p: any) => sum + (p.abono ?? 0), 0)
  const newBalance = Math.max(0, price - totalPaid)

  const { data, error } = await supabase
    .from('Patient_Services')
    .update({ name, price, balance: newBalance })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logAudit(supabase, {
    userId:      auth.userId,
    userName:    auth.nombre,
    action:      'editar',
    entity:      'servicio',
    entityId:    id,
    patientName: fullPatientName((before as any)?.Patient),
    serviceName: name,
    details: {
      antes:   { nombre: before?.name, precio: before?.price },
      despues: { nombre: name, precio: price },
      balance_nuevo: newBalance,
    },
  })

  return Response.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  const [{ data: service }, { data: payments }] = await Promise.all([
    supabase.from('Patient_Services')
      .select('name, price, balance, Patient(name, apellido_pat, apellido_mat)')
      .eq('id', id).single(),
    supabase.from('Payment_History').select('abono').eq('patient_service_id', id),
  ])

  await supabase.from('Payment_History').delete().eq('patient_service_id', id)

  const { error } = await supabase
    .from('Patient_Services')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const totalAbonado = (payments ?? []).reduce((sum: number, p: any) => sum + (p.abono ?? 0), 0)
  await logAudit(supabase, {
    userId:      auth.userId,
    userName:    auth.nombre,
    action:      'eliminar',
    entity:      'servicio',
    entityId:    id,
    patientName: fullPatientName((service as any)?.Patient),
    serviceName: service?.name ?? null,
    details: {
      precio:             service?.price,
      saldo_pendiente:    service?.balance,
      abonos_eliminados:  (payments ?? []).length,
      total_abonado:      totalAbonado,
    },
  })

  return Response.json({ success: true })
}
