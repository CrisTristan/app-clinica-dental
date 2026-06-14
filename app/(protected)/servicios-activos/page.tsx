"use client"

import PatientServiceCard from "../../components/patient_service"
import { useEffect, useState, useMemo, useCallback } from "react"
import { PatientServiceRow, Service } from "@/app/types/types"
import { authentication } from "@/app/actions/authentication"
import { hasAccess } from "@/lib/roles"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, ChevronDown } from "lucide-react"

type SortKey = "name" | "pending-desc" | "pending-asc" | "total-desc" | "status"

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 shadow-sm">
      <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ServiciosActivosPage() {
  const [canAccess, setCanAccess]           = useState<boolean | null>(null)
  const [services, setServices]             = useState<PatientServiceRow[]>([])
  const [search,   setSearch]               = useState("")
  const [sort,     setSort]                 = useState<SortKey>("pending-desc")
  const [showPaid, setShowPaid]             = useState(false)

  // ── Nuevo servicio ──────────────────────────────────────
  const [newServOpen, setNewServOpen]       = useState(false)
  const [catalog,     setCatalog]           = useState<Service[]>([])
  const [patientQ,    setPatientQ]          = useState('')
  const [patientResults, setPatientResults] = useState<{ id: number; name: string; apellido_pat?: string }[]>([])
  const [selectedPatient, setSelectedPatient] = useState<{ id: number; label: string } | null>(null)
  const [newName,  setNewName]              = useState('')
  const [newPrice, setNewPrice]             = useState('')
  const [creating, setCreating]             = useState(false)

  const loadServices = useCallback(async () => {
    const res  = await fetch("/api/patient-services")
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
    setServices(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => {
    const init = async () => {
      const session = await authentication()
      if (!hasAccess(session?.user?.role)) { setCanAccess(false); return }
      setCanAccess(true)
      loadServices()
    }
    init()
  }, [loadServices])

  // Search patients as user types
  useEffect(() => {
    if (!patientQ.trim()) { setPatientResults([]); return }
    const timeout = setTimeout(async () => {
      const res  = await fetch(`/patients/api?q=${encodeURIComponent(patientQ)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setPatientResults(data ?? [])
    }, 300)
    return () => clearTimeout(timeout)
  }, [patientQ])

  const openNewServ = async () => {
    // Load catalog when opening dialog
    if (catalog.length === 0) {
      const res  = await fetch('/api/catalog')
      const data = await res.json()
      setCatalog(data ?? [])
    }
    setNewServOpen(true)
  }

  const selectCatalogService = (s: Service) => {
    setNewName(s.name)
    setNewPrice(String(s.price))
  }

  const handleCreate = async () => {
    if (!selectedPatient || !newName || !newPrice) return
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) return
    setCreating(true)
    await fetch('/api/patient-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: selectedPatient.id, name: newName, price }),
    })
    setCreating(false)
    setNewServOpen(false)
    setSelectedPatient(null)
    setPatientQ('')
    setNewName('')
    setNewPrice('')
    loadServices()
  }

  /* ── Estadísticas ── */
  const stats = useMemo(() => {
    const total     = services.reduce((s, r) => s + (r.price   ?? 0), 0)
    const pending   = services.reduce((s, r) => s + (r.balance ?? 0), 0)
    const collected = total - pending
    const paid      = services.filter(r => r.balance === 0).length
    return { total, pending, collected, paid, count: services.length }
  }, [services])

  /* ── Filtro + agrupación (pendientes arriba, pagados abajo) ── */
  const sortByKey = useCallback((a: PatientServiceRow, b: PatientServiceRow) => {
    if (sort === "name")         return a.patient_name.localeCompare(b.patient_name)
    if (sort === "pending-desc") return (b.balance ?? 0) - (a.balance ?? 0)
    if (sort === "pending-asc")  return (a.balance ?? 0) - (b.balance ?? 0)
    if (sort === "total-desc")   return (b.price ?? 0) - (a.price ?? 0)
    if (sort === "status") {
      // sin pagar primero, luego en curso
      const rank = (r: PatientServiceRow) => (r.balance >= r.price ? 0 : 1)
      return rank(a) - rank(b)
    }
    return 0
  }, [sort])

  const searched = useMemo(() => {
    const q = search.toLowerCase()
    return services.filter(r =>
      r.patient_name.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q)
    )
  }, [services, search])

  const pendingList = useMemo(
    () => searched.filter(r => (r.balance ?? 0) > 0).sort(sortByKey),
    [searched, sortByKey]
  )

  const paidList = useMemo(
    () => searched.filter(r => (r.balance ?? 0) === 0)
      .sort((a, b) => a.patient_name.localeCompare(b.patient_name)),
    [searched]
  )

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })

  /* ── Guards ── */
  if (canAccess === null)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (!canAccess)
    return <p className="p-4 text-gray-500 dark:text-slate-400">No tienes permiso para acceder a esta página.</p>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ── Header ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0">
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

            <Button
              onClick={openNewServ}
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl shadow-sm px-4 py-2 h-auto"
            >
              <Plus className="w-4 h-4" />
              Nuevo servicio
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total servicios" value={String(stats.count)}   sub={`${stats.paid} completados`}                                                                  color="text-gray-800 dark:text-slate-100" />
          <StatCard label="Total facturado" value={fmt(stats.total)}      sub="valor acumulado"                                                                               color="text-gray-800 dark:text-slate-100" />
          <StatCard label="Cobrado"         value={fmt(stats.collected)}  sub={`${stats.total > 0 ? Math.round((stats.collected / stats.total) * 100) : 0}% del total`}     color="text-green-600 dark:text-green-400" />
          <StatCard label="Pendiente"       value={fmt(stats.pending)}    sub="por cobrar"                                                                                    color="text-red-500 dark:text-red-400" />
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
              type="text" placeholder="Buscar por paciente o servicio…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                         bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                         placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
            />
          </div>
          <select
            value={sort} onChange={e => setSort(e.target.value as SortKey)}
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
        {pendingList.length === 0 && paidList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-slate-400 font-medium">
              {search ? "Sin resultados para tu búsqueda" : "No hay servicios registrados"}
            </p>
            {search
              ? <button onClick={() => setSearch("")} className="mt-2 text-xs text-sky-500 hover:text-sky-600 transition-colors">Limpiar búsqueda</button>
              : <button onClick={openNewServ} className="mt-3 text-xs text-sky-500 hover:text-sky-600 transition-colors underline">Agregar el primero</button>
            }
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── En seguimiento (pendientes) ── */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">En seguimiento</h2>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {pendingList.length} {pendingList.length === 1 ? "servicio por cobrar" : "servicios por cobrar"}
                  {search && ` · "${search}"`}
                </span>
              </div>
              {pendingList.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 py-6 text-center">
                  {search ? "Ningún pendiente coincide con tu búsqueda" : "No hay servicios pendientes 🎉"}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pendingList.map(s => (
                    <PatientServiceCard key={s.id} {...s} onRefresh={loadServices} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Pagados (colapsable) ── */}
            {paidList.length > 0 && (
              <section className="space-y-3">
                <button
                  onClick={() => setShowPaid(v => !v)}
                  className="flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Pagados</h2>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {paidList.length} {paidList.length === 1 ? "liquidado" : "liquidados"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPaid ? "rotate-180" : ""}`} />
                </button>
                {showPaid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paidList.map(s => (
                      <PatientServiceCard key={s.id} {...s} onRefresh={loadServices} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Dialog: Nuevo servicio ── */}
      <Dialog open={newServOpen} onOpenChange={setNewServOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-slate-100">Nuevo servicio</DialogTitle>
            <DialogDescription className="text-gray-400 dark:text-slate-500">
              Asigna un servicio a un paciente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Paciente */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Paciente</p>
              {selectedPatient ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800">
                  <span className="text-sm font-medium text-sky-700 dark:text-sky-300">{selectedPatient.label}</span>
                  <button
                    onClick={() => { setSelectedPatient(null); setPatientQ('') }}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >✕</button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="text" placeholder="Buscar paciente…"
                    value={patientQ} onChange={e => setPatientQ(e.target.value)}
                    className="text-sm"
                  />
                  {patientResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg overflow-hidden">
                      {patientResults.map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => {
                            setSelectedPatient({ id: p.id, label: [p.name, p.apellido_pat].filter(Boolean).join(' ') })
                            setPatientResults([])
                            setPatientQ('')
                          }}
                        >
                          {[p.name, p.apellido_pat].filter(Boolean).join(' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Catálogo */}
            {catalog.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Del catálogo</p>
                <ScrollArea className="h-28">
                  <div className="flex flex-wrap gap-2 pr-2">
                    {catalog.map(s => (
                      <button
                        key={s.id}
                        onClick={() => selectCatalogService(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-600 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        {s.name} <span className="text-gray-400">${s.price}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Nombre y precio */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Servicio</p>
              <div className="space-y-2">
                <Input type="text" placeholder="Nombre del servicio"
                  value={newName} onChange={e => setNewName(e.target.value)} className="text-sm" />
                <Input type="number" placeholder="Precio"
                  value={newPrice} onChange={e => setNewPrice(e.target.value)} min={1} className="text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => setNewServOpen(false)}>Cancelar</Button>
            <Button size="sm" disabled={creating || !selectedPatient || !newName || !newPrice}
              className="bg-sky-500 hover:bg-sky-600 text-white" onClick={handleCreate}>
              {creating ? "Creando…" : "Crear servicio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
