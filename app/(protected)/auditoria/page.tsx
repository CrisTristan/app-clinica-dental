"use client"

import { useEffect, useState, useCallback } from "react"
import { authentication } from "@/app/actions/authentication"
import { can } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react"
import { METODO_PAGO_LABELS } from "@/app/types/types"

type AuditRow = {
  id: number
  created_at: string
  user_name: string | null
  action: "crear" | "editar" | "eliminar"
  entity: "servicio" | "abono"
  entity_id: string
  patient_name: string | null
  service_name: string | null
  details: Record<string, any>
}

type AuditData = {
  rows: AuditRow[]
  total: number
  page: number
  pageSize: number
}

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 })

const toISO = (d: Date) => d.toISOString().split("T")[0]

const ACTION_BADGE: Record<AuditRow["action"], string> = {
  crear:    "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  editar:   "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  eliminar: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
}

const ACTION_LABELS: Record<AuditRow["action"], string> = {
  crear: "Creó", editar: "Editó", eliminar: "Eliminó",
}

const ENTITY_LABELS: Record<AuditRow["entity"], string> = {
  servicio: "Servicio", abono: "Abono",
}

const metodoLabel = (m?: string) =>
  m ? (METODO_PAGO_LABELS as Record<string, string>)[m] ?? m : ""

function describe(row: AuditRow): string {
  const d = row.details ?? {}

  if (row.entity === "abono") {
    if (row.action === "crear")
      return `Cobro de ${fmt(d.abono ?? 0)} (${metodoLabel(d.metodo_pago)}). Saldo: ${fmt(d.balance_anterior ?? 0)} → ${fmt(d.balance_nuevo ?? 0)}`
    if (row.action === "editar") {
      const cambios: string[] = []
      if (d.antes?.abono !== d.despues?.abono)
        cambios.push(`monto ${fmt(d.antes?.abono ?? 0)} → ${fmt(d.despues?.abono ?? 0)}`)
      if (d.antes?.metodo_pago !== d.despues?.metodo_pago)
        cambios.push(`método ${metodoLabel(d.antes?.metodo_pago)} → ${metodoLabel(d.despues?.metodo_pago)}`)
      const detalle = cambios.length ? cambios.join(", ") : "sin cambios de monto ni método"
      return `Modificó el abono: ${detalle}. Saldo resultante: ${fmt(d.balance_nuevo ?? 0)}`
    }
  }

  if (row.entity === "servicio") {
    if (row.action === "crear")
      return `Servicio registrado con precio ${fmt(d.precio ?? 0)}`
    if (row.action === "editar") {
      const cambios: string[] = []
      if (d.antes?.nombre !== d.despues?.nombre)
        cambios.push(`nombre "${d.antes?.nombre}" → "${d.despues?.nombre}"`)
      if (d.antes?.precio !== d.despues?.precio)
        cambios.push(`precio ${fmt(d.antes?.precio ?? 0)} → ${fmt(d.despues?.precio ?? 0)}`)
      const detalle = cambios.length ? cambios.join(", ") : "sin cambios de nombre ni precio"
      return `Modificó el servicio: ${detalle}. Saldo resultante: ${fmt(d.balance_nuevo ?? 0)}`
    }
    if (row.action === "eliminar")
      return `Servicio eliminado (precio ${fmt(d.precio ?? 0)}, saldo pendiente ${fmt(d.saldo_pendiente ?? 0)}) junto con ${d.abonos_eliminados ?? 0} abono(s) por ${fmt(d.total_abonado ?? 0)}`
  }

  return "—"
}

export default function AuditoriaPage() {
  const [canAccess, setCanAccess] = useState<boolean | null>(null)
  const [from, setFrom]           = useState("")
  const [to, setTo]               = useState("")
  const [action, setAction]       = useState("")
  const [entity, setEntity]       = useState("")
  const [page, setPage]           = useState(1)
  const [data, setData]           = useState<AuditData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")

  useEffect(() => {
    authentication().then(s => setCanAccess(can(s?.user?.role, "auditoria")))
  }, [])

  const load = useCallback(async (opts: { from: string; to: string; action: string; entity: string; page: number }) => {
    setLoading(true)
    setError("")
    try {
      const qs = new URLSearchParams()
      if (opts.from)   qs.set("from", opts.from)
      if (opts.to)     qs.set("to", opts.to)
      if (opts.action) qs.set("action", opts.action)
      if (opts.entity) qs.set("entity", opts.entity)
      qs.set("page", String(opts.page))

      const res  = await fetch(`/api/admin/audit-log?${qs}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? "Error al cargar la bitácora"); setData(null) }
      else setData(json)
    } catch {
      setError("No se pudo conectar con el servidor")
      setData(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (canAccess) load({ from, to, action, entity, page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess])

  const applyFilters = (next: Partial<{ from: string; to: string; action: string; entity: string }> = {}) => {
    const f = { from, to, action, entity, ...next }
    setFrom(f.from); setTo(f.to); setAction(f.action); setEntity(f.entity)
    setPage(1)
    load({ ...f, page: 1 })
  }

  const goToPage = (p: number) => {
    setPage(p)
    load({ from, to, action, entity, page: p })
  }

  const quickRanges = [
    { label: "Hoy", get: () => ({ from: toISO(new Date()), to: toISO(new Date()) }) },
    { label: "Últimos 7 días", get: () => {
        const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6)
        return { from: toISO(start), to: toISO(end) }
      } },
    { label: "Este mes", get: () => {
        const now = new Date()
        return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now) }
      } },
    { label: "Todo", get: () => ({ from: "", to: "" }) },
  ]

  if (canAccess === null)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (!canAccess)
    return <p className="p-4 text-gray-500 dark:text-slate-400">No tienes permiso para acceder a esta página.</p>

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  const selectClass = `h-10 px-3 text-sm rounded-xl border border-gray-200 dark:border-slate-600
    bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200
    focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors`

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0">
              <ScrollText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Bitácora de Auditoría</h1>
              <p className="text-xs text-gray-400 dark:text-slate-500">Quién hizo qué y cuándo en servicios y cobros</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Filtros ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Desde</label>
                <input
                  type="date" value={from} max={to || undefined}
                  onChange={e => setFrom(e.target.value)}
                  className={selectClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Hasta</label>
                <input
                  type="date" value={to} min={from || undefined}
                  onChange={e => setTo(e.target.value)}
                  className={selectClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Acción</label>
                <select value={action} onChange={e => setAction(e.target.value)} className={selectClass}>
                  <option value="">Todas</option>
                  <option value="crear">Crear</option>
                  <option value="editar">Editar</option>
                  <option value="eliminar">Eliminar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Tipo</label>
                <select value={entity} onChange={e => setEntity(e.target.value)} className={selectClass}>
                  <option value="">Todos</option>
                  <option value="servicio">Servicios</option>
                  <option value="abono">Abonos</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => applyFilters()}
                  disabled={loading}
                  className="h-10 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl"
                >
                  {loading ? "Cargando…" : "Consultar"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:ml-auto">
              {quickRanges.map(({ label, get }) => (
                <button
                  key={label}
                  onClick={() => applyFilters(get())}
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

        {/* ── Tabla ── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data || data.rows.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-16">
              Sin movimientos registrados con los filtros seleccionados
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 text-left">
                      {["Fecha y hora", "Usuario", "Acción", "Paciente / Servicio", "Detalle"].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                    {data.rows.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors align-top">
                        <td className="px-4 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("es-MX", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100 whitespace-nowrap">
                          {r.user_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${ACTION_BADGE[r.action]}`}>
                            {ACTION_LABELS[r.action]} {ENTITY_LABELS[r.entity].toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-medium text-gray-700 dark:text-slate-200">{r.patient_name ?? "—"}</span>
                          <span className="block text-xs text-gray-400 dark:text-slate-500">{r.service_name ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-300 max-w-md">{describe(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Paginación ── */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  {data.total} {data.total === 1 ? "movimiento" : "movimientos"} · página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400
                               hover:border-sky-400 hover:text-sky-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400
                               hover:border-sky-400 hover:text-sky-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
