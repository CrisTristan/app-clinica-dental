export const runtime = 'nodejs'

import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateReciboPDF } from "@/lib/pdf/recibo"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(rolesFor('cobros'))
    if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

    const { id } = await params
    const supabase = createAdminClient()

    const { data: payment, error: payErr } = await supabase
      .from('Payment_History')
      .select('*, Patient_Services(id, name, price, patient_id, Patient(name, apellido_pat, apellido_mat, telefono))')
      .eq('id', id)
      .single()

    if (payErr || !payment) {
      return Response.json({ error: `Pago no encontrado: ${payErr?.message ?? 'null'}` }, { status: 404 })
    }

    const service = payment.Patient_Services as any
    const patient = service?.Patient as any

    if (!service) {
      return Response.json({ error: "Servicio no encontrado en el pago" }, { status: 404 })
    }

    const { data: prevPayments } = await supabase
      .from('Payment_History')
      .select('id, abono')
      .eq('patient_service_id', service.id)
      .lte('id', id)

    const totalPaid  = (prevPayments ?? []).reduce((s: number, p: any) => s + p.abono, 0)
    const newBalance = Math.max(0, service.price - totalPaid)

    const patientName = [patient?.name, patient?.apellido_pat, patient?.apellido_mat]
      .filter(Boolean).join(' ')

    const pdf = await generateReciboPDF({
      paymentId:    payment.id,
      patientName,
      patientPhone: patient?.telefono ?? '',
      serviceName:  service.name,
      totalPrice:   service.price,
      abono:        payment.abono,
      newBalance,
      fecha:        payment.fecha,
      metodoPago:   payment.metodo_pago ?? undefined,
    })

    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="recibo-${id}.pdf"`,
        'Content-Length':      String(pdf.length),
        'Cache-Control':       'no-store',
      },
    })
  } catch (err: any) {
    console.error('[receipt] Error generando PDF:', err)
    return Response.json({ error: err?.message ?? 'Error interno' }, { status: 500 })
  }
}
