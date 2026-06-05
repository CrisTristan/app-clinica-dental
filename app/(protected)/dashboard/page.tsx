"use client"

import { authentication } from "@/app/actions/authentication"
import { isAdmin } from "@/lib/roles"
import { useEffect, useState, useMemo } from "react"
import { format, parseISO, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from "chart.js"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Calendar, DollarSign, AlertCircle, Users,
  Search, ChevronRight, Clock, TrendingUp,
} from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

/* ── Types ── */
type Appointment = {
  id: string; desc: string; startDate: string; endDate: string; status?: string
  name: { id: number; name: string; apellido_pat: string; telefono: string }
}
type Patient = {
  id: number; name: string; apellido_pat: string; apellido_mat: string; telefono: string
  Appointment?: { startDate: string }[]
  servicios?: { balance: number; price: number; paymentHistory: { abono: number; fecha: string }[] }[]
}

/* ── Helpers ── */
const fmt = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })

function initials(name: string, ap?: string | null) {
  return `${name?.[0] ?? ""}${ap?.[0] ?? ""}`.toUpperCase() || "?"
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  Confirmar:       { label: "Confirmada",    cls: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"  },
  "Por Confirmar": { label: "Por confirmar", cls: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800" },
  Cancelar:        { label: "Cancelada",     cls: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"    },
}
const getStatus = (s?: string) => STATUS_CFG[s ?? ""] ?? STATUS_CFG["Por Confirmar"]

/* ── Stat card ── */
function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub: string
  icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent.replace("text-", "bg-").replace("-600", "-100").replace("-400", "-900/30")}`}>
          <Icon className={`w-5 h-5 ${accent}`} />
        </div>
      </div>
    </div>
  )
}

/* ── Section card ── */
function Section({ title, icon: Icon, children, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50 dark:border-slate-700">
        <Icon className="w-4 h-4 text-sky-500" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ══════════════════════════════════════════ */
export default function DashboardPage() {
  const { theme } = useTheme()
  const router    = useRouter()

  const [canAccess,    setCanAccess]    = useState<boolean | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients,     setPatients]     = useState<Patient[]>([])
  const [searchTerm,   setSearchTerm]   = useState("")
  const [filterDate,   setFilterDate]   = useState(new Date().toISOString().split("T")[0])

  /* ── Auth ── */
  useEffect(() => {
    authentication().then(s => setCanAccess(isAdmin(s?.user?.role) ? true : false))
  }, [])

  /* ── Fetch appointments ── */
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    fetch(`/appointments/api?startDate=${today}`)
      .then(r => r.json())
      .then(setAppointments)
      .catch(console.error)
  }, [])

  /* ── Fetch patients ── */
  useEffect(() => {
    fetch("/patients/api")
      .then(r => r.json())
      .then(setPatients)
      .catch(console.error)
  }, [])

  /* ── Computed values ── */
  const { pendingMoney, monthIncome, incomingPerMonth, todayCount } = useMemo(() => {
    const today = new Date()
    let pendingMoney = 0
    let monthIncome  = 0
    const incomingPerMonth = new Array(12).fill(0)
    const todayCount = appointments.filter(a => isSameDay(parseISO(a.startDate), today)).length

    patients.forEach(p => {
      p.servicios?.forEach(s => {
        pendingMoney += s.balance ?? 0
        s.paymentHistory?.forEach(pay => {
          const m = new Date(pay.fecha).getMonth()
          if (!isNaN(m) && m >= 0 && m < 12) {
            const abono = Number(pay.abono) || 0
            incomingPerMonth[m] += abono
            if (m === today.getMonth()) monthIncome += abono
          }
        })
      })
    })
    return { pendingMoney, monthIncome, incomingPerMonth, todayCount }
  }, [patients, appointments])

  /* ── Filtered data ── */
  const filteredAppointments = useMemo(() =>
    appointments.filter(a => {
      const d = parseISO(a.startDate)
      const [y, mo, day] = filterDate.split("-").map(Number)
      return d.getFullYear() === y && d.getMonth() + 1 === mo && d.getDate() === day
    }),
  [appointments, filterDate])

  const filteredPatients = useMemo(() =>
    patients.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.telefono.includes(searchTerm)
    ),
  [patients, searchTerm])

  /* ── Chart config ── */
  const isDark = theme === "dark"
  const gridColor  = isDark ? "rgba(100,116,139,0.3)" : "rgba(226,232,240,1)"
  const labelColor = isDark ? "#94a3b8" : "#6b7280"

  const chartData = {
    labels: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
    datasets: [{
      label: "Ingresos",
      data: incomingPerMonth,
      fill: true,
      borderColor: "#0ea5e9",
      backgroundColor: isDark ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.08)",
      pointBackgroundColor: "#0ea5e9",
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4,
      borderWidth: 2,
    }],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${fmt(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 11 } } },
      y: {
        grid: { color: gridColor },
        ticks: { color: labelColor, font: { size: 11 }, callback: (v: any) => fmt(v) },
      },
    },
  }

  /* ── Guards ── */
  if (canAccess === null)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  if (!canAccess)
    return <p className="p-6 text-gray-500 dark:text-slate-400">No tienes permiso para acceder a esta página.</p>

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm overflow-hidden shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Dashboard</h1>
                <p className="text-xs text-gray-400 dark:text-slate-500 capitalize">
                  {format(new Date(), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                             bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400
                             border border-sky-200 dark:border-sky-800">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              Administrador
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Citas hoy"         value={String(todayCount)}      sub="programadas"       icon={Calendar}      accent="text-sky-600 dark:text-sky-400"     />
          <StatCard label="Ingresos del mes"  value={fmt(monthIncome)}        sub="cobrado este mes"  icon={DollarSign}    accent="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Cobros pendientes" value={fmt(pendingMoney)}       sub="por cobrar"        icon={AlertCircle}   accent="text-red-500 dark:text-red-400"      />
          <StatCard label="Total pacientes"   value={String(patients.length)} sub="registrados"       icon={Users}         accent="text-indigo-600 dark:text-indigo-400"  />
        </div>

        {/* Chart + Appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Income chart */}
          <Section title="Ingresos anuales" icon={TrendingUp} className="lg:col-span-2">
            <Line data={chartData} options={chartOptions as any} />
          </Section>

          {/* Today's appointments */}
          <Section title="Citas del día" icon={Clock}>
            {/* Date picker */}
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="w-full mb-4 h-9 px-3 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                         bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100
                         focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
            />
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="w-8 h-8 text-gray-200 dark:text-slate-700 mb-2" />
                  <p className="text-xs text-gray-400 dark:text-slate-500">Sin citas para esta fecha</p>
                </div>
              ) : (
                filteredAppointments.map(apt => {
                  const st = getStatus(apt.status)
                  return (
                    <div key={apt.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-xs font-bold overflow-hidden">
                        <span className="leading-none">{initials(apt.name.name, apt.name.apellido_pat)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-100 truncate">
                          {apt.name.name} {apt.name.apellido_pat}
                        </p>
                        <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                          {format(parseISO(apt.startDate), "HH:mm")} – {format(parseISO(apt.endDate), "HH:mm")}
                        </p>
                        <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border mt-0.5 ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Section>
        </div>

        {/* Patient list */}
        <Section title="Pacientes" icon={Users}>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 h-9 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                         bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                         placeholder:text-gray-400 dark:placeholder:text-slate-500
                         focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
            />
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredPatients.length === 0 ? (
              <p className="text-center text-xs text-gray-400 dark:text-slate-500 py-8">
                {searchTerm ? `Sin resultados para "${searchTerm}"` : "No hay pacientes registrados"}
              </p>
            ) : (
              filteredPatients.map(patient => {
                const hoy     = new Date()
                const ultima  = patient.Appointment?.filter(a => new Date(a.startDate) < hoy) ?? []
                const proxima = patient.Appointment?.filter(a => new Date(a.startDate) > hoy) ?? []
                const pending = patient.servicios?.filter(s => s.balance > 0).length ?? 0

                return (
                  <div
                    key={patient.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-700
                               hover:bg-sky-50/50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/pacientes/${encodeURIComponent(patient.id)}/?id=${patient.id}&name=${patient.name}`)}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-sm font-bold shrink-0 overflow-hidden">
                      <span className="leading-none">{initials(patient.name, patient.apellido_pat)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                        {[patient.name, patient.apellido_pat, patient.apellido_mat].filter(Boolean).join(" ")}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-gray-400 dark:text-slate-500">{patient.telefono}</span>
                        {ultima.length > 0 && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">
                            Última: {ultima[ultima.length - 1]?.startDate?.split("T")[0]}
                          </span>
                        )}
                        {proxima.length > 0 && (
                          <span className="text-[10px] text-sky-500 dark:text-sky-400">
                            Próxima: {proxima[0]?.startDate?.split("T")[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {pending > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                          ${pending} pend.
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-sky-400 transition-colors" />
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {filteredPatients.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500 text-right mt-3">
              {filteredPatients.length} paciente{filteredPatients.length !== 1 ? "s" : ""}
              {searchTerm && ` · "${searchTerm}"`}
            </p>
          )}
        </Section>

      </div>
    </div>
  )
}
