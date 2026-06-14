"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authentication } from "@/app/actions/authentication"
import { can } from "@/lib/permissions"

type PatientLite = {
  id: number
  name: string
  apellido_pat?: string
  apellido_mat?: string
  telefono: string
}

const fullName = (p: PatientLite) =>
  [p.name, p.apellido_pat, p.apellido_mat].filter(Boolean).join(" ")

const initials = (p: PatientLite) =>
  `${p.name?.[0] ?? ""}${p.apellido_pat?.[0] ?? ""}`.toUpperCase() || "?"

export default function DirectorioPacientes() {
  const [canAccess, setCanAccess] = useState<boolean | null>(null)
  const [patients, setPatients]   = useState<PatientLite[]>([])
  const [search, setSearch]       = useState("")
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const session = await authentication()
      if (!can(session?.user?.role, "pacientes")) { setCanAccess(false); return }
      setCanAccess(true)
      const res  = await fetch("/patients/api?list=1")
      const data = await res.json()
      setPatients(Array.isArray(data) ? data : [])
    }
    init()
  }, [])

  const filtered = patients.filter(p =>
    `${fullName(p)} ${p.telefono}`.toLowerCase().includes(search.trim().toLowerCase())
  )

  const open = (p: PatientLite) =>
    router.push(`/pacientes/${encodeURIComponent(p.id)}/?id=${p.id}&name=${encodeURIComponent(p.name)}`)

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

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Pacientes</h1>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {patients.length} {patients.length === 1 ? "paciente registrado" : "pacientes registrados"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">

        {/* Búsqueda */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" placeholder="Buscar por nombre o teléfono…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                       bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                       placeholder:text-gray-400 dark:placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
          />
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-16">
            {search ? `Sin resultados para "${search}"` : "No hay pacientes registrados"}
          </p>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm divide-y divide-gray-50 dark:divide-slate-700 overflow-hidden">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => open(p)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sky-50/50 dark:hover:bg-slate-700/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-xs font-bold shrink-0">
                  <span className="leading-none">{initials(p)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {fullName(p)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{p.telefono}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
