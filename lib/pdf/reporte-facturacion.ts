import PDFDocument from 'pdfkit'

export interface ReporteRow {
  fecha: string          // YYYY-MM-DD
  paciente: string
  servicio: string
  metodoPago: string     // efectivo | tarjeta | transferencia
  registradoPor: string  // nombre del usuario que cobró, o '—'
  abono: number
}

export interface ReporteData {
  from: string           // YYYY-MM-DD
  to: string             // YYYY-MM-DD
  rows: ReporteRow[]
  total: number
  porMetodo: Record<string, number>
}

const METODO_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
}

const fmt = (n: number) =>
  `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtFecha = (f: string) =>
  new Date(f + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

export async function generateReporteFacturacionPDF(data: ReporteData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const PAGE_W = 595.28   // A4 vertical
    const PAGE_H = 841.89
    const MARGIN = 40
    const CW     = PAGE_W - MARGIN * 2

    const doc = new PDFDocument({ size: 'A4', margin: MARGIN })
    const chunks: Buffer[] = []
    doc.on('data',  (c: Buffer) => chunks.push(c))
    doc.on('end',   ()          => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Columnas: fecha 70 | paciente 130 | servicio 130 | método 75 | cobró 80 | abono 70
    const COLS = [
      { key: 'fecha',         label: 'Fecha',    w: 70,  align: 'left'  as const },
      { key: 'paciente',      label: 'Paciente', w: 130, align: 'left'  as const },
      { key: 'servicio',      label: 'Servicio', w: 130, align: 'left'  as const },
      { key: 'metodoPago',    label: 'Método',   w: 75,  align: 'left'  as const },
      { key: 'registradoPor', label: 'Cobró',    w: 80,  align: 'left'  as const },
      { key: 'abono',         label: 'Abono',    w: 70,  align: 'right' as const },
    ]

    const header = () => {
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#0369a1')
         .text('CLINICA DENTAL', MARGIN, MARGIN)
      doc.fontSize(10).font('Helvetica').fillColor('#64748b')
         .text('Reporte de Facturación', MARGIN, doc.y + 2)
      doc.fontSize(9).fillColor('#94a3b8')
         .text(`Periodo: ${fmtFecha(data.from)} — ${fmtFecha(data.to)}`, MARGIN, doc.y + 2)
      doc.moveDown(0.8)
    }

    const tableHeader = () => {
      const y = doc.y
      doc.rect(MARGIN, y - 4, CW, 20).fill('#f1f5f9')
      let x = MARGIN + 6
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#475569')
      COLS.forEach(col => {
        doc.text(col.label, x, y + 1, { width: col.w - 10, align: col.align })
        x += col.w
      })
      doc.y = y + 18
    }

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > PAGE_H - MARGIN) {
        doc.addPage()
        doc.y = MARGIN
        tableHeader()
      }
    }

    header()
    tableHeader()

    if (data.rows.length === 0) {
      doc.moveDown(1)
      doc.fontSize(10).font('Helvetica').fillColor('#94a3b8')
         .text('Sin pagos registrados en el periodo seleccionado.', MARGIN, doc.y, { align: 'center', width: CW })
    }

    data.rows.forEach((row, i) => {
      ensureSpace(18)
      const y = doc.y
      if (i % 2 === 1) doc.rect(MARGIN, y - 3, CW, 16).fill('#f8fafc')

      const values: Record<string, string> = {
        fecha:         fmtFecha(row.fecha),
        paciente:      row.paciente,
        servicio:      row.servicio,
        metodoPago:    METODO_LABELS[row.metodoPago] ?? row.metodoPago,
        registradoPor: row.registradoPor,
        abono:         fmt(row.abono),
      }

      let x = MARGIN + 6
      doc.fontSize(8).font('Helvetica').fillColor('#334155')
      COLS.forEach(col => {
        doc.text(values[col.key], x, y, {
          width: col.w - 10, align: col.align, lineBreak: false, ellipsis: true,
        })
        x += col.w
      })
      doc.y = y + 15
    })

    // ── Resumen ───────────────────────────────────────────
    ensureSpace(120)
    doc.moveDown(0.5)
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CW, doc.y)
       .strokeColor('#cbd5e1').lineWidth(0.5).stroke()
    doc.moveDown(0.6)

    const yTotal = doc.y
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a')
       .text(`Total cobrado (${data.rows.length} ${data.rows.length === 1 ? 'pago' : 'pagos'})`, MARGIN, yTotal)
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0369a1')
       .text(fmt(data.total), MARGIN, yTotal, { align: 'right', width: CW })
    doc.moveDown(0.8)

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#94a3b8')
       .text('DESGLOSE POR MÉTODO DE PAGO', MARGIN, doc.y)
    doc.moveDown(0.3)

    Object.entries(METODO_LABELS).forEach(([key, label]) => {
      const monto = data.porMetodo[key] ?? 0
      const y = doc.y
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text(label, MARGIN, y)
      doc.fontSize(9).font('Helvetica').fillColor('#374151')
         .text(fmt(monto), MARGIN, y, { align: 'right', width: CW })
      doc.y = y + 14
    })

    // ── Footer ────────────────────────────────────────────
    doc.moveDown(1)
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
       .text(`Generado el ${new Date().toLocaleString('es-MX')}`, MARGIN, doc.y, { align: 'center', width: CW })

    doc.end()
  })
}
