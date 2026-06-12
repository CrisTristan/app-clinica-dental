import PDFDocument from 'pdfkit'

export interface ReciboData {
  paymentId: number
  patientName: string
  patientPhone: string
  serviceName: string
  totalPrice: number
  abono: number
  newBalance: number
  fecha: string   // YYYY-MM-DD
  metodoPago?: string   // efectivo | tarjeta | transferencia
}

const METODO_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
}

export async function generateReciboPDF(data: ReciboData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const PAGE_W = 300
    const MARGIN = 24
    const CW     = PAGE_W - MARGIN * 2   // content width

    const doc = new PDFDocument({ size: [PAGE_W, 600], margin: MARGIN, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data',  (c: Buffer) => chunks.push(c))
    doc.on('end',   ()          => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const fmt = (n: number) =>
      `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    const fechaFmt = new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

    const divider = () => {
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CW, doc.y)
        .strokeColor('#cbd5e1').lineWidth(0.5).stroke()
      doc.moveDown(0.5)
    }

    // ── Header ────────────────────────────────────────────
    doc.fontSize(15).font('Helvetica-Bold').fillColor('#0369a1')
       .text('CLINICA DENTAL', { align: 'center' })
    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
       .text('Recibo de Pago', { align: 'center' })
    doc.moveDown(0.7)
    divider()

    // ── Folio + Fecha ─────────────────────────────────────
    const yFolio = doc.y
    doc.fontSize(8).fillColor('#94a3b8').text(`Folio #${data.paymentId}`)
    doc.fontSize(8).fillColor('#94a3b8').text(fechaFmt, MARGIN, yFolio, { align: 'right', width: CW })
    doc.moveDown(0.8)

    // ── Paciente ──────────────────────────────────────────
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#94a3b8').text('PACIENTE')
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(data.patientName)
    if (data.patientPhone) {
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(`Tel: ${data.patientPhone}`)
    }
    doc.moveDown(0.8)
    divider()

    // ── Servicio ──────────────────────────────────────────
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#94a3b8').text('SERVICIO')
    doc.fontSize(11).font('Helvetica').fillColor('#0f172a').text(data.serviceName)
    doc.moveDown(0.8)
    divider()

    // ── Montos ────────────────────────────────────────────
    const amounts: { label: string; value: string; accent: boolean }[] = [
      { label: 'Precio total',   value: fmt(data.totalPrice), accent: false },
      { label: 'Abono recibido', value: fmt(data.abono),      accent: true  },
      { label: 'Saldo restante', value: fmt(data.newBalance), accent: false },
    ]
    amounts.forEach(({ label, value, accent }) => {
      const y = doc.y
      doc.fontSize(9)
         .font(accent ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(accent ? '#0369a1' : '#374151')
         .text(label)
      doc.fontSize(9)
         .font(accent ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(accent ? '#0369a1' : '#374151')
         .text(value, MARGIN, y, { align: 'right', width: CW })
    })

    if (data.metodoPago) {
      const y = doc.y
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text('Método de pago')
      doc.fontSize(9).font('Helvetica').fillColor('#374151')
         .text(METODO_LABELS[data.metodoPago] ?? data.metodoPago, MARGIN, y, { align: 'right', width: CW })
    }
    doc.moveDown(0.8)

    // ── Liquidado ─────────────────────────────────────────
    if (data.newBalance === 0) {
      divider()
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#16a34a')
         .text('SERVICIO LIQUIDADO EN SU TOTALIDAD', { align: 'center' })
      doc.moveDown(0.5)
    }

    // ── Footer ────────────────────────────────────────────
    divider()
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
       .text(`Generado el ${new Date().toLocaleString('es-MX')}`, { align: 'center' })

    doc.end()
  })
}
