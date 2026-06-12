import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateReciboPDF } from "@/lib/pdf/recibo"
import { Resend } from "resend"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { paymentId, channels } = await req.json() as {
    paymentId: number
    channels: { email?: string; whatsapp?: boolean }
  }

  if (!paymentId) return Response.json({ error: "paymentId requerido" }, { status: 400 })

  const supabase = createAdminClient()

  const { data: payment } = await supabase
    .from('Payment_History')
    .select('*, Patient_Services(id, name, price, patient_id, Patient(name, apellido_pat, apellido_mat, telefono))')
    .eq('id', paymentId)
    .single()

  if (!payment) return Response.json({ error: "Pago no encontrado" }, { status: 404 })

  const service = payment.Patient_Services as any
  const patient = service?.Patient as any

  const { data: prevPayments } = await supabase
    .from('Payment_History')
    .select('id, abono')
    .eq('patient_service_id', service.id)
    .lte('id', paymentId)

  const totalPaid  = (prevPayments ?? []).reduce((s: number, p: any) => s + p.abono, 0)
  const newBalance = Math.max(0, service.price - totalPaid)

  const patientName = [patient?.name, patient?.apellido_pat, patient?.apellido_mat]
    .filter(Boolean).join(' ')

  const results: Record<string, string> = {}

  // ── Email ─────────────────────────────────────────────
  if (channels.email) {
    const pdfBuffer = await generateReciboPDF({
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

    const resend  = new Resend(process.env.AUTH_RESEND_KEY)
    const { error } = await resend.emails.send({
      from:    'Clinica Dental <onboarding@resend.dev>',
      to:      channels.email,
      subject: `Recibo de pago - ${service.name}`,
      html:    buildEmailHtml({ patientName, serviceName: service.name, abono: payment.abono, newBalance, fecha: payment.fecha }),
      attachments: [{
        filename: `recibo-${paymentId}.pdf`,
        content:  pdfBuffer.toString('base64'),
      }],
    })
    results.email = error ? `error: ${error.message}` : 'enviado'
  }

  // ── WhatsApp ──────────────────────────────────────────
  if (channels.whatsapp && patient?.telefono) {
    const fmt = (n: number) =>
      `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

    const msg = [
      `*Clinica Dental - Recibo de Pago*`,
      `Folio: #${payment.id}`,
      `Paciente: ${patientName}`,
      `Servicio: ${service.name}`,
      `Abono recibido: ${fmt(payment.abono)}`,
      `Saldo restante: ${fmt(newBalance)}`,
      newBalance === 0 ? `\n*Servicio liquidado en su totalidad*` : '',
    ].filter(Boolean).join('\n')

    try {
      const waRes = await fetch('https://api-whatsapp-sc2l.onrender.com/send-message', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: patient.telefono, message: msg }),
      })
      results.whatsapp = waRes.ok ? 'enviado' : `error: ${waRes.status}`
    } catch {
      results.whatsapp = 'error: no se pudo conectar'
    }
  }

  return Response.json({ ok: true, results })
}

function buildEmailHtml(d: {
  patientName: string; serviceName: string
  abono: number; newBalance: number; fecha: string
}) {
  const fmt = (n: number) =>
    `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
  const fechaFmt = new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  return `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h2 style="color:#0369a1;margin-bottom:4px">Clinica Dental</h2>
  <p style="color:#64748b;margin:0">Recibo de Pago — ${fechaFmt}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
  <p><strong>Paciente:</strong> ${d.patientName}</p>
  <p><strong>Servicio:</strong> ${d.serviceName}</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px">
    <tr style="background:#f8fafc">
      <td style="padding:8px 12px">Abono recibido</td>
      <td style="padding:8px 12px;text-align:right;color:#0369a1;font-weight:bold">${fmt(d.abono)}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px">Saldo restante</td>
      <td style="padding:8px 12px;text-align:right">${fmt(d.newBalance)}</td>
    </tr>
  </table>
  ${d.newBalance === 0 ? '<p style="color:#16a34a;font-weight:bold;margin-top:16px">Servicio liquidado en su totalidad</p>' : ''}
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">El recibo en PDF está adjunto a este correo.</p>
</div>`
}
