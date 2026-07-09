export const runtime = 'nodejs'

import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateReporteFacturacionPDF, ReporteRow } from "@/lib/pdf/reporte-facturacion"
import { NextRequest } from "next/server"
import ExcelJS from "exceljs"

const METODO_LABELS: Record<string, string> = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest) {
  const auth = await requireRole(rolesFor('reportes'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const params = new URL(req.url).searchParams
  const from   = params.get('from') ?? ''
  const to     = params.get('to') ?? ''
  const format = params.get('format') ?? 'json'

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return Response.json({ error: "from y to son requeridos (YYYY-MM-DD)" }, { status: 400 })
  }
  if (from > to) {
    return Response.json({ error: "from no puede ser mayor que to" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('Payment_History')
    .select('id, abono, fecha, metodo_pago, Patient_Services(name, Patient(nombre, apellido_pat, apellido_mat)), profiles(nombre)')
    .gte('fecha', from)
    .lte('fecha', to)
    .order('fecha', { ascending: true })
    .order('id',    { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const rows: ReporteRow[] = (data ?? []).map((p: any) => {
    const patient = p.Patient_Services?.Patient
    return {
      fecha:         p.fecha,
      paciente:      [patient?.nombre, patient?.apellido_pat, patient?.apellido_mat].filter(Boolean).join(' ') || '—',
      servicio:      p.Patient_Services?.name ?? '—',
      metodoPago:    p.metodo_pago ?? 'efectivo',
      registradoPor: p.profiles?.nombre ?? '—',
      abono:         p.abono ?? 0,
    }
  })

  const total = rows.reduce((s, r) => s + r.abono, 0)
  const porMetodo = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.metodoPago] = (acc[r.metodoPago] ?? 0) + r.abono
    return acc
  }, {})

  if (format === 'pdf') {
    const pdf = await generateReporteFacturacionPDF({ from, to, rows, total, porMetodo })
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="facturacion_${from}_${to}.pdf"`,
        'Cache-Control':       'no-store',
      },
    })
  }

  if (format === 'excel') {
    const buffer = await buildExcel(from, to, rows, total, porMetodo)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="facturacion_${from}_${to}.xlsx"`,
        'Cache-Control':       'no-store',
      },
    })
  }

  return Response.json({
    from, to, rows,
    summary: { total, count: rows.length, porMetodo },
  })
}

async function buildExcel(
  from: string, to: string, rows: ReporteRow[],
  total: number, porMetodo: Record<string, number>,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Clinica Dental'
  const ws = wb.addWorksheet('Facturación')

  ws.columns = [
    { header: 'Fecha',          key: 'fecha',         width: 14 },
    { header: 'Paciente',       key: 'paciente',      width: 32 },
    { header: 'Servicio',       key: 'servicio',      width: 32 },
    { header: 'Método de pago', key: 'metodoPago',    width: 18 },
    { header: 'Cobró',          key: 'registradoPor', width: 24 },
    { header: 'Abono',          key: 'abono',         width: 14 },
  ]

  // Título y periodo (insertados antes del header de columnas)
  ws.spliceRows(1, 0, ['Clínica Dental — Reporte de Facturación'], [`Periodo: ${from} a ${to}`], [])
  ws.mergeCells('A1:F1')
  ws.mergeCells('A2:F2')
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0369A1' } }
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' } }

  const headerRow = ws.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } }
    cell.alignment = { vertical: 'middle' }
  })

  rows.forEach(r => {
    ws.addRow({
      fecha:         r.fecha,
      paciente:      r.paciente,
      servicio:      r.servicio,
      metodoPago:    METODO_LABELS[r.metodoPago] ?? r.metodoPago,
      registradoPor: r.registradoPor,
      abono:         r.abono,
    })
  })

  const moneyFmt = '"$"#,##0.00'
  ws.getColumn('abono').numFmt = moneyFmt

  // Totales
  ws.addRow([])
  const totalRow = ws.addRow(['', '', '', '', `Total (${rows.length} pagos)`, total])
  totalRow.font = { bold: true }
  totalRow.getCell(6).numFmt = moneyFmt

  ws.addRow([])
  const tituloDesglose = ws.addRow(['', '', '', '', 'Desglose por método', ''])
  tituloDesglose.font = { bold: true, color: { argb: 'FF64748B' } }
  Object.entries(METODO_LABELS).forEach(([key, label]) => {
    const r = ws.addRow(['', '', '', '', label, porMetodo[key] ?? 0])
    r.getCell(6).numFmt = moneyFmt
  })

  return wb.xlsx.writeBuffer() as Promise<ArrayBuffer>
}
