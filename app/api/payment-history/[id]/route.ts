import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, fullPatientName } from "@/lib/audit"
import { NextRequest } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { abono, patient_service_id, metodo_pago } = await req.json()
  if (!abono || abono <= 0 || !patient_service_id) {
    return Response.json({ error: "abono válido y patient_service_id son requeridos" }, { status: 400 })
  }
  if (metodo_pago && !['efectivo', 'tarjeta', 'transferencia'].includes(metodo_pago)) {
    return Response.json({ error: "metodo_pago inválido (efectivo, tarjeta o transferencia)" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const [{ data: oldPayment }, { data: service }] = await Promise.all([
    supabase.from('Payment_History').select('abono, metodo_pago').eq('id', id).single(),
    supabase.from('Patient_Services')
      .select('balance, price, name, Patient(name, apellido_pat, apellido_mat)')
      .eq('id', patient_service_id).single(),
  ])

  if (!oldPayment) return Response.json({ error: "Pago no encontrado" }, { status: 404 })
  if (!service)    return Response.json({ error: "Servicio no encontrado" }, { status: 404 })

  // Restore old amount then apply new
  const restoredBalance = service.balance + oldPayment.abono
  const newBalance      = Math.max(0, restoredBalance - abono)
  const fecha           = new Date().toISOString().split('T')[0]

  const { data: updated, error } = await supabase
    .from('Payment_History')
    .update({ abono, fecha, ...(metodo_pago ? { metodo_pago } : {}) })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  await supabase
    .from('Patient_Services')
    .update({ balance: newBalance })
    .eq('id', patient_service_id)

  await logAudit(supabase, {
    userId:      auth.userId,
    userName:    auth.nombre,
    action:      'editar',
    entity:      'abono',
    entityId:    id,
    patientName: fullPatientName((service as any).Patient),
    serviceName: (service as any).name,
    details: {
      antes:   { abono: oldPayment.abono, metodo_pago: oldPayment.metodo_pago ?? 'efectivo' },
      despues: { abono, metodo_pago: metodo_pago ?? oldPayment.metodo_pago ?? 'efectivo' },
      balance_nuevo: newBalance,
    },
  })

  return Response.json({ payment: updated, newBalance })
}
