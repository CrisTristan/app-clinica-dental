"use client"
import Scheduler from "../../components/scheduler"
import { useEffect, useState } from "react"
import { authentication } from "@/app/actions/authentication"
import { hasAccess, ROLE_LABELS, type Role } from "@/lib/roles"

const DAYS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]
const MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]

function todayLabel() {
  const d = new Date()
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

export default function Agenda() {
  const [canAccess, setCanAccess] = useState<boolean | null>(null)
  const [role, setRole]           = useState<Role | null>(null)

  useEffect(() => {
    authentication().then(session => {
      const r = session?.user?.role
      if (hasAccess(r)) {
        setRole(r ?? null)
        setCanAccess(true)
      } else {
        setCanAccess(false)
      }
    })
  }, [])

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0 overflow-hidden">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 leading-tight">Agenda</h1>
                <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">{todayLabel()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                ${role === "admin"
                  ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
                  : "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {role ? ROLE_LABELS[role] : ""}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* Scheduler */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <Scheduler />
        </div>
      </div>

    </div>
  )
}
