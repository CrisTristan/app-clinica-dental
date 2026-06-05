import { PatientService } from "../types/types"

const STATUS = {
  paid:    { label: "Pagado",    bar: "bg-green-500",  badge: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",  dot: "bg-green-500"  },
  partial: { label: "En curso",  bar: "bg-sky-500",    badge: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",              dot: "bg-sky-500"    },
  unpaid:  { label: "Sin pagar", bar: "bg-red-400",    badge: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",              dot: "bg-red-400"    },
}

export default function PatientServiceCard({ name, activeService, totalCost, balance }: PatientService) {
  const paid     = (totalCost ?? 0) - (balance ?? 0)
  const progress = totalCost > 0 ? Math.min(Math.round((paid / totalCost) * 100), 100) : 0
  const key      = balance === 0 ? "paid" : balance >= totalCost ? "unpaid" : "partial"
  const status   = STATUS[key]

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map(w => w[0] ?? "")
    .join("")
    .toUpperCase()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">

      {/* Header: avatar + nombre + estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-sm font-bold shrink-0 overflow-hidden">
            <span className="leading-none">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm truncate">{name}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{activeService}</p>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${status.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-1.5">
          <span>Progreso de pago</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50 dark:border-slate-700">
        <div className="text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Total</p>
          <p className="text-sm font-bold text-gray-700 dark:text-slate-200">${totalCost?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Pagado</p>
          <p className="text-sm font-bold text-green-600 dark:text-green-400">${paid?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">Pendiente</p>
          <p className={`text-sm font-bold ${balance > 0 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-slate-500"}`}>
            ${balance?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

    </div>
  )
}
