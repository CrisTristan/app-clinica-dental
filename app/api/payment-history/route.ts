import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, fullPatientName } from "@/lib/audit"
import { NextRequest } from "next/server"

const METODOS_VALIDOS = ['efectivo', 'tarjeta', 'transferencia']

export async function GET(req: NextRequest) {
  const auth = await requireRole(rolesFor('cobros'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const serviceId = new URL(req.url).searchParams.get('serviceId')
  const supabase  = createAdminClient()

  const query = supabase
    .from('Payment_History')
    .select('*, profiles(nombre)')
    .order('fecha', { ascending: true })
  if (serviceId) query.eq('patient_service_id', serviceId)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map(({ profiles, ...row }: any) => ({
    ...row,
    registrado_por_nombre: profiles?.nombre ?? null,
  }))
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(rolesFor('cobros'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { patient_service_id, abono, metodo_pago } = await req.json()
  if (!patient_service_id || !abono || abono <= 0) {
    return Response.json({ error: "patient_service_id y abono válido son requeridos" }, { status: 400 })
  }
  const metodo = metodo_pago ?? 'efectivo'
  if (!METODOS_VALIDOS.includes(metodo)) {
    return Response.json({ error: "metodo_pago inválido (efectivo, tarjeta o transferencia)" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Contexto para la bitácora (lectura; no interviene en el cálculo del saldo).
  const { data: service } = await supabase
    .from('Patient_Services')
    .select('name, Patient(nombre, apellido_pat, apellido_mat)')
    .eq('id', patient_service_id)
    .single()

  // Cobro atómico: inserta el abono y recalcula el balance en una sola
  // transacción con bloqueo de fila (ver supabase/atomic_payments.sql).
  const { data: rows, error } = await supabase.rpc('registrar_abono', {
    p_service_id: patient_service_id,
    p_abono:      abono,
    p_metodo:     metodo,
    p_user:       auth.userId,
  })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  const result = Array.isArray(rows) ? rows[0] : rows
  if (!result) return Response.json({ error: "Servicio no encontrado" }, { status: 404 })

  const applied    = Number(result.abono)
  const newBalance = Number(result.new_balance)
  const payment    = { id: Number(result.payment_id), abono: applied }

  await logAudit(supabase, {
    userId:      auth.userId,
    userName:    auth.nombre,
    action:      'crear',
    entity:      'abono',
    entityId:    String(payment.id),
    patientName: fullPatientName((service as any)?.Patient),
    serviceName: (service as any)?.name,
    details: {
      abono:            applied,
      metodo_pago:      metodo,
      balance_anterior: newBalance + applied,
      balance_nuevo:    newBalance,
    },
  })

  return Response.json({ payment, newBalance }, { status: 201 })
}
