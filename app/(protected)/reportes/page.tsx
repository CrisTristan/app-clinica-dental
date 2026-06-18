"use client"

import { useEffect, useState, useCallback } from "react"
import { authentication } from "@/app/actions/authentication"
import { can } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText, Banknote, CreditCard, ArrowLeftRight, Receipt } from "lucide-react"
import { METODO_PAGO_LABELS, MetodoPago } from "@/app/types/types"

type ReportRow = {
  fecha: string
  paciente: string
  servicio: string
  metodoPago: MetodoPago
  registradoPor: string
  abono: number
}

type ReportData = {
  rows: ReportRow[]
  summary: { total: number; count: number; porMetodo: Record<string, number> }
}

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })

const toISO = (d: Date) => d.toISOString().split("T")[0]

function monthRange(offset = 0) {
  const now   = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last  = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { from: toISO(first), to: toISO(last) }
}

const METODO_BADGE: Record<MetodoPago, string> = {
  efectivo:      "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  tarjeta:       "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  transferencia: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">{label}</p>
          <p className={`text-xl font-bold mt-1 ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
        <Icon className={`w-5 h-5 ${accent} opacity-70`} />
      </div>
    </div>
  )
}

export default function ReportesPage() {
  const [canAccess, setCanAccess] = useState<boolean | null>(null)
  const [from, setFrom]           = useState(monthRange().from)
  const [to, setTo]               = useState(monthRange().to)
  const [data, setData]           = useState<ReportData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")

  useEffect(() => {
    authentication().then(s => setCanAccess(can(s?.user?.role, "reportes")))
  }, [])

  const loadReport = useCallback(async (f: string, t: string) => {
    if (!f || !t) return
    setLoading(true)
    setError("")
    try {
      const res  = await fetch(`/api/reports/billing?from=${f}&to=${t}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Error al cargar el reporte"); setData(null) }
      else setData(json)
    } catch {
      setError("No se pudo conectar con el servidor")
      setData(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (canAccess) loadReport(from, to)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess])

  const applyRange = (f: string, t: string) => {
    setFrom(f)
    setTo(t)
    loadReport(f, t)
  }

  const quickRanges = [
    { label: "Hoy",          get: () => ({ from: toISO(new Date()), to: toISO(new Date()) }) },
    { label: "Últimos 7 días", get: () => {
        const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6)
        return { from: toISO(start), to: toISO(end) }
      } },
    { label: "Este mes",     get: () => monthRange(0) },
    { label: "Mes anterior", get: () => monthRange(-1) },
  ]

  const exportUrl = (format: "excel" | "pdf") =>
    `/api/reports/billing?from=${from}&to=${to}&format=${format}`

  if (canAccess === null)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (!canAccess)
    return <p className="p-4 text-gray-500 dark:text-slate-400">No tienes permiso para acceder a esta página.</p>

  const summary = data?.summary

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Reportes de Facturación</h1>
                <p className="text-xs text-gray-400 dark:text-slate-500">Cobros por rango de fechas, exportables a Excel y PDF</p>
              </div>
            </div>

            <div className="flex gap-2">
              <a href={exportUrl("excel")} download>
                <Button
                  disabled={!data || data.rows.length === 0}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm px-4 py-2 h-auto"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </Button>
              </a>
              <a href={exportUrl("pdf")} download>
                <Button
                  disabled={!data || data.rows.length === 0}
                  className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl shadow-sm px-4 py-2 h-auto"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Selector de rango ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Desde</label>
                <input
                  type="date" value={from} max={to}
                  onChange={e => setFrom(e.target.value)}
                  className="h-10 px-3 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                             bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200
                             focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Hasta</label>
                <input
                  type="date" value={to} min={from}
                  onChange={e => setTo(e.target.value)}
                  className="h-10 px-3 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                             bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200
                             focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => loadReport(from, to)}
                  disabled={loading || !from || !to}
                  className="h-10 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl"
                >
                  {loading ? "Cargando…" : "Consultar"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:ml-auto">
              {quickRanges.map(({ label, get }) => (
                <button
                  key={label}
                  onClick={() => { const r = get(); applyRange(r.from, r.to) }}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600
                             text-gray-500 dark:text-slate-400 hover:border-sky-400 hover:text-sky-600
                             dark:hover:text-sky-400 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {/* ── Stats ── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total cobrado" value={fmt(summary.total)} sub={`${summary.count} ${summary.count === 1 ? "pago" : "pagos"}`}
              icon={Receipt} accent="text-gray-800 dark:text-slate-100" />
            <StatCard label="Efectivo" value={fmt(summary.porMetodo.efectivo ?? 0)}
              icon={Banknote} accent="text-green-600 dark:text-green-400" />
            <StatCard label="Tarjeta" value={fmt(summary.porMetodo.tarjeta ?? 0)}
              icon={CreditCard} accent="text-violet-600 dark:text-violet-400" />
            <StatCard label="Transferencia" value={fmt(summary.porMetodo.transferencia ?? 0)}
              icon={ArrowLeftRight} accent="text-sky-600 dark:text-sky-400" />
          </div>
        )}

        {/* ── Tabla ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data || data.rows.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-16">
              Sin pagos registrados en el periodo seleccionado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 text-left">
                    {["Fecha", "Paciente", "Servicio", "Método", "Cobró", "Abono"].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide ${h === "Abono" ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {data.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(r.fecha + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">{r.paciente}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{r.servicio}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${METODO_BADGE[r.metodoPago] ?? METODO_BADGE.efectivo}`}>
                          {METODO_PAGO_LABELS[r.metodoPago] ?? r.metodoPago}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{r.registradoPor}</td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-slate-100 whitespace-nowrap">{fmt(r.abono)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-slate-700/50">
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-right">
                      Total del periodo
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                      {fmt(summary?.total ?? 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
