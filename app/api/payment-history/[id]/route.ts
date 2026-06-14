import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, fullPatientName } from "@/lib/audit"
import { NextRequest } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(rolesFor('cobros'))
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

  // Contexto para la bitácora (lectura; no interviene en el cálculo del saldo).
  const [{ data: oldPayment }, { data: service }] = await Promise.all([
    supabase.from('Payment_History').select('abono, metodo_pago').eq('id', id).single(),
    supabase.from('Patient_Services')
      .select('name, Patient(name, apellido_pat, apellido_mat)')
      .eq('id', patient_service_id).single(),
  ])

  // Edición atómica: tope al saldo real y recálculo del balance en una sola
  // transacción con bloqueo de fila (ver supabase/atomic_payments.sql).
  const { data: rows, error } = await supabase.rpc('editar_abono', {
    p_payment_id: Number(id),
    p_service_id: patient_service_id,
    p_abono:      abono,
    p_metodo:     metodo_pago ?? null,
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const result = Array.isArray(rows) ? rows[0] : rows
  if (!result) return Response.json({ error: "Pago o servicio no encontrado" }, { status: 404 })

  const applied    = Number(result.abono)
  const newBalance = Number(result.new_balance)
  const updated    = {
    id:          Number(result.payment_id),
    abono:       applied,
    fecha:       result.fecha,
    metodo_pago: metodo_pago ?? oldPayment?.metodo_pago ?? 'efectivo',
  }

  await logAudit(supabase, {
    userId:      auth.userId,
    userName:    auth.nombre,
    action:      'editar',
    entity:      'abono',
    entityId:    id,
    patientName: fullPatientName((service as any)?.Patient),
    serviceName: (service as any)?.name,
    details: {
      antes:   { abono: oldPayment?.abono, metodo_pago: oldPayment?.metodo_pago ?? 'efectivo' },
      despues: { abono: applied, metodo_pago: metodo_pago ?? oldPayment?.metodo_pago ?? 'efectivo' },
      balance_nuevo: newBalance,
    },
  })

  return Response.json({ payment: updated, newBalance })
}
