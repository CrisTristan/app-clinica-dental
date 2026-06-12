import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, fullPatientName } from "@/lib/audit"
import { NextRequest } from "next/server"

const METODOS_VALIDOS = ['efectivo', 'tarjeta', 'transferencia']

export async function GET(req: NextRequest) {
  const auth = await requireStaff()
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
  const auth = await requireStaff()
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

  const { data: service } = await supabase
    .from('Patient_Services')
    .select('balance, name, Patient(name, apellido_pat, apellido_mat)')
    .eq('id', patient_service_id)
    .single()

  if (!service) return Response.json({ error: "Servicio no encontrado" }, { status: 404 })

  const applied    = Math.min(abono, service.balance)
  const newBalance = service.balance - applied
  const fecha      = new Date().toISOString().split('T')[0]

  const { data: payment, error: payErr } = await supabase
    .from('Payment_History')
    .insert({
      patient_service_id,
      abono:          applied,
      fecha,
      metodo_pago:    metodo,
      registrado_por: auth.userId,
    })
    .select()
    .single()

  if (payErr) return Response.json({ error: payErr.message }, { status: 500 })

  await supabase
    .from('Patient_Services')
    .update({ balance: newBalance })
    .eq('id', patient_service_id)

  await logAudit(supabase, {
    userId:      auth.userId,
    userName:    auth.nombre,
    action:      'crear',
    entity:      'abono',
    entityId:    payment.id,
    patientName: fullPatientName((service as any).Patient),
    serviceName: (service as any).name,
    details: {
      abono:           applied,
      metodo_pago:     metodo,
      balance_anterior: service.balance,
      balance_nuevo:    newBalance,
    },
  })

  return Response.json({ payment, newBalance }, { status: 201 })
}
