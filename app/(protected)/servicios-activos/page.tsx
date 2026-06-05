"use client"

import PatientServiceCard from "../../components/patient_service"
import { useEffect, useState, useMemo } from "react"
import { PatientService } from "@/app/types/types"
import { authentication } from "@/app/actions/authentication"
import { hasAccess } from "@/lib/roles"

type SortKey = "name" | "pending-desc" | "pending-asc" | "total-desc" | "status"

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm`}>
      <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ServiciosActivosPage() {
  const [canAccess, setCanAccess]       = useState<boolean | null>(null)
  const [activeServices, setActiveServices] = useState<PatientService[]>([])
  const [search,  setSearch]            = useState("")
  const [sort,    setSort]              = useState<SortKey>("name")

  useEffect(() => {
    const init = async () => {
      const session = await authentication()
      if (!hasAccess(session?.user?.role)) {
        setCanAccess(false)
        return
      }
      setCanAccess(true)

      const res  = await fetch("/patients/api")
      const data = await res.json()
      const services: PatientService[] = []

      data.forEach((patient: {
        name: string
        servicios: { name: string; price: number; balance: number }[]
      }) => {
        patient.servicios?.forEach(s => {
          services.push({
            name:          patient.name,
            activeService: s.name,
            totalCost:     s.price,
            balance:       s.balance,
          })
        })
      })

      setActiveServices(services)
    }
    init()
  }, [])

  /* ── Estadísticas ── */
  const stats = useMemo(() => {
    const total     = activeServices.reduce((s, r) => s + (r.totalCost ?? 0), 0)
    const pending   = activeServices.reduce((s, r) => s + (r.balance   ?? 0), 0)
    const collected = total - pending
    const paid      = activeServices.filter(r => r.balance === 0).length
    return { total, pending, collected, paid, count: activeServices.length }
  }, [activeServices])

  /* ── Filtro + orden ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const list = activeServices.filter(
      r =>
        r.name.toLowerCase().includes(q) ||
        r.activeService.toLowerCase().includes(q)
    )
    return list.sort((a, b) => {
      if (sort === "name")         return a.name.localeCompare(b.name)
      if (sort === "pending-desc") return (b.balance ?? 0) - (a.balance ?? 0)
      if (sort === "pending-asc")  return (a.balance ?? 0) - (b.balance ?? 0)
      if (sort === "total-desc")   return (b.totalCost ?? 0) - (a.totalCost ?? 0)
      if (sort === "status") {
        const rank = (r: PatientService) =>
          r.balance === 0 ? 2 : r.balance >= r.totalCost ? 0 : 1
        return rank(b) - rank(a)
      }
      return 0
    })
  }, [activeServices, search, sort])

  /* ── Guards ── */
  if (canAccess === null)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (!canAccess)
    return (
      <p className="p-4 text-gray-500 dark:text-slate-400">
        No tienes permiso para acceder a esta página.
      </p>
    )

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0 overflow-hidden">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Servicios Activos</h1>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {stats.count} {stats.count === 1 ? "servicio registrado" : "servicios registrados"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total servicios"  value={String(stats.count)}         sub={`${stats.paid} completados`}        color="text-gray-800 dark:text-slate-100" />
          <StatCard label="Total facturado"  value={fmt(stats.total)}             sub="valor acumulado"                    color="text-gray-800 dark:text-slate-100" />
          <StatCard label="Cobrado"          value={fmt(stats.collected)}         sub={`${stats.total > 0 ? Math.round((stats.collected / stats.total) * 100) : 0}% del total`} color="text-green-600 dark:text-green-400" />
          <StatCard label="Pendiente"        value={fmt(stats.pending)}           sub="por cobrar"                         color="text-red-500 dark:text-red-400"    />
        </div>

        {/* ── Barra de cobro global ── */}
        {stats.total > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-2">
              <span className="font-medium">Cobro global</span>
              <span>{stats.total > 0 ? Math.round((stats.collected / stats.total) * 100) : 0}% cobrado</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-700"
                style={{ width: `${stats.total > 0 ? (stats.collected / stats.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Búsqueda y ordenación ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por paciente o servicio…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                         placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
            />
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortKey)}
            className="h-10 px-3 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                       bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200
                       focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
          >
            <option value="name">Ordenar: A–Z</option>
            <option value="pending-desc">Mayor pendiente primero</option>
            <option value="pending-asc">Menor pendiente primero</option>
            <option value="total-desc">Mayor costo primero</option>
            <option value="status">Por estado</option>
          </select>
        </div>

        {/* ── Grid de tarjetas ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-slate-400 font-medium">
              {search ? "Sin resultados para tu búsqueda" : "No hay servicios activos"}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-sky-500 hover:text-sky-600 transition-colors"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}
              {search && ` para "${search}"`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((s, i) => (
                <PatientServiceCard key={i} {...s} />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
