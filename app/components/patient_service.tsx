'use client'

import { useState } from 'react'
import { MoreVertical, Download, Copy, MessageCircle, CheckCircle2, X } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PatientServiceRow, PaymentHistoryRow, MetodoPago, METODO_PAGO_LABELS } from '../types/types'

const STATUS = {
  paid:    { label: "Pagado",    bar: "bg-green-500",  badge: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",  dot: "bg-green-500"  },
  partial: { label: "En curso",  bar: "bg-sky-500",    badge: "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",              dot: "bg-sky-500"    },
  unpaid:  { label: "Sin pagar", bar: "bg-red-400",    badge: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",              dot: "bg-red-400"    },
}

interface Props extends PatientServiceRow {
  onRefresh: () => void
}

interface AbonoResult {
  paymentId: number
  amount: number
  newBalance: number
}

export default function PatientServiceCard({
  id, patient_name, patient_phone, patient_email, name, price, balance, onRefresh,
}: Props) {
  const paid     = (price ?? 0) - (balance ?? 0)
  const progress = price > 0 ? Math.min(Math.round((paid / price) * 100), 100) : 0
  const statusKey = balance === 0 ? 'paid' : balance >= price ? 'unpaid' : 'partial'
  const status    = STATUS[statusKey]

  const initials = patient_name
    .split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()

  const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

  // ── Abonar ──────────────────────────────────────────────
  const [abonarOpen, setAbonarOpen]       = useState(false)
  const [abonoAmount, setAbonoAmount]     = useState('')
  const [metodoPago, setMetodoPago]       = useState<MetodoPago>('efectivo')
  const [abonoLoading, setAbonoLoading]   = useState(false)
  const [abonoResult, setAbonoResult]     = useState<AbonoResult | null>(null)
  const [copied,      setCopied]          = useState<string | null>(null)

  const handleAbonar = async () => {
    const amount = parseFloat(abonoAmount)
    if (isNaN(amount) || amount <= 0) return
    setAbonoLoading(true)
    const res  = await fetch('/api/payment-history', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ patient_service_id: id, abono: amount, metodo_pago: metodoPago }),
    })
    const data = await res.json()
    setAbonoLoading(false)
    if (res.ok && data.payment) {
      setAbonoResult({ paymentId: data.payment.id, amount: data.payment.abono, newBalance: data.newBalance })
      setAbonoAmount('')
      // No se refresca aquí: si el servicio se liquida, el refresco lo movería
      // a la sección "Pagados" (colapsada) y desmontaría esta ventana de recibo.
      // El refresco ocurre al cerrar (closeAbonar).
    }
  }

  const closeAbonar = () => {
    setAbonarOpen(false)
    setAbonoResult(null)
    setCopied(null)
    onRefresh()  // Refresca la lista al cerrar, ya con la ventana del recibo fuera.
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  // Mensaje del recibo para WhatsApp. wa.me solo PRE-LLENA el texto; el envío
  // lo confirma la recepcionista (no hay auto-envío por link). El teléfono
  // local de 10 dígitos se prefija con 52 (México).
  const waText = abonoResult ? [
    `*Clínica Dental — Recibo de pago*`,
    `Folio: #${abonoResult.paymentId}`,
    `Paciente: ${patient_name}`,
    `Servicio: ${name}`,
    `Abono recibido: ${fmt(abonoResult.amount)}`,
    `Saldo restante: ${fmt(abonoResult.newBalance)}`,
    abonoResult.newBalance === 0 ? `Servicio liquidado en su totalidad` : '',
  ].filter(Boolean).join('\n') : ''
  const waDigits = (patient_phone ?? '').replace(/\D/g, '')
  const waPhone  = waDigits.length === 10 ? `52${waDigits}` : waDigits
  const waLink   = `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`

  // ── Editar ──────────────────────────────────────────────
  const [editarOpen, setEditarOpen]     = useState(false)
  const [editName, setEditName]         = useState(name)
  const [editPrice, setEditPrice]       = useState(String(price))
  const [editLoading, setEditLoading]   = useState(false)

  const handleEditar = async () => {
    const numPrice = parseFloat(editPrice)
    if (!editName || isNaN(numPrice) || numPrice <= 0) return
    setEditLoading(true)
    await fetch(`/api/patient-services/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: editName, price: numPrice }),
    })
    setEditLoading(false)
    setEditarOpen(false)
    onRefresh()
  }

  // ── Historial ────────────────────────────────────────────
  const [historialOpen, setHistorialOpen]       = useState(false)
  const [payments, setPayments]                 = useState<PaymentHistoryRow[]>([])
  const [historialLoading, setHistorialLoading] = useState(false)
  const [editingAbono, setEditingAbono]         = useState('')
  const [editAbonoLoading, setEditAbonoLoading] = useState(false)

  const loadHistorial = async () => {
    setHistorialLoading(true)
    const res  = await fetch(`/api/payment-history?serviceId=${id}`)
    const data = await res.json()
    setPayments(data ?? [])
    if (data?.length > 0) setEditingAbono(String(data[data.length - 1].abono))
    setHistorialLoading(false)
  }

  const handleEditLastAbono = async () => {
    if (payments.length === 0) return
    const last   = payments[payments.length - 1]
    const amount = parseFloat(editingAbono)
    if (isNaN(amount) || amount <= 0) return
    setEditAbonoLoading(true)
    await fetch(`/api/payment-history/${last.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ abono: amount, patient_service_id: id }),
    })
    setEditAbonoLoading(false)
    await loadHistorial()
    // El refresco de la lista ocurre al cerrar el historial (closeHistorial),
    // para no desmontar este diálogo si la edición liquida el servicio.
  }

  const closeHistorial = (open: boolean) => {
    setHistorialOpen(open)
    if (!open) onRefresh()
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-sm font-bold shrink-0">
            <span className="leading-none">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-slate-100 text-sm truncate">{patient_name}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${status.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={balance === 0}
                onSelect={() => { setAbonoAmount(''); setMetodoPago('efectivo'); setAbonoResult(null); setAbonarOpen(true) }}
              >
                Abonar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setEditName(name); setEditPrice(String(price)); setEditarOpen(true) }}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setHistorialOpen(true); loadHistorial() }}>
                Historial de pagos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-1.5">
          <span>Progreso de pago</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${status.bar}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50 dark:border-slate-700">
        {[
          { label: "Total",     value: price,   color: "text-gray-700 dark:text-slate-200" },
          { label: "Pagado",    value: paid,    color: "text-green-600 dark:text-green-400" },
          { label: "Pendiente", value: balance, color: balance > 0 ? "text-red-500 dark:text-red-400" : "text-gray-400 dark:text-slate-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
            <p className={`text-sm font-bold ${color}`}>${value?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
          </div>
        ))}
      </div>

      {/* ── Dialog: Abonar ── */}
      <Dialog open={abonarOpen} onOpenChange={closeAbonar}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">

          {/* ── Panel de registro ── */}
          {!abonoResult ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-gray-800 dark:text-slate-100">Registrar abono</DialogTitle>
                <DialogDescription className="text-gray-400 dark:text-slate-500">
                  Pendiente: <span className="font-semibold text-red-500">{fmt(balance)}</span>
                </DialogDescription>
              </DialogHeader>
              <Input
                type="number" placeholder="Monto a abonar"
                value={abonoAmount} onChange={e => setAbonoAmount(e.target.value)}
                min={0.01} max={balance} className="text-sm"
              />
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Método de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(METODO_PAGO_LABELS) as MetodoPago[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodoPago(m)}
                      className={`text-xs font-medium px-2 py-2 rounded-lg border transition-colors ${
                        metodoPago === m
                          ? 'bg-sky-50 dark:bg-sky-900/30 border-sky-400 text-sky-600 dark:text-sky-400'
                          : 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-sky-300'
                      }`}
                    >
                      {METODO_PAGO_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <Button variant="outline" size="sm" onClick={closeAbonar}>Cancelar</Button>
                <Button size="sm" disabled={abonoLoading || !abonoAmount}
                  className="bg-sky-500 hover:bg-sky-600 text-white" onClick={handleAbonar}>
                  {abonoLoading ? "Guardando…" : "Confirmar abono"}
                </Button>
              </div>
            </>
          ) : (
            /* ── Panel de recibo ── */
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <DialogTitle className="text-gray-800 dark:text-slate-100">Abono registrado</DialogTitle>
                  </div>
                  <button onClick={closeAbonar} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <DialogDescription className="sr-only">Opciones de recibo</DialogDescription>
              </DialogHeader>

              {/* Resumen */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Abono</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">{fmt(abonoResult.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Saldo restante</span>
                  <span className={`font-semibold ${abonoResult.newBalance === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-slate-200'}`}>
                    {fmt(abonoResult.newBalance)}
                  </span>
                </div>
                {abonoResult.newBalance === 0 && (
                  <p className="text-center text-green-600 dark:text-green-400 font-semibold text-xs pt-1">
                    Servicio liquidado
                  </p>
                )}
              </div>

              {/* Descargar */}
              <a
                href={`/api/payment-history/receipt/${abonoResult.paymentId}`}
                download={`recibo-${abonoResult.paymentId}.pdf`}
                className="flex items-center justify-center gap-2 w-full rounded-lg border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 text-sm font-medium py-2 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar recibo PDF
              </a>

              {/* Enviar recibo manualmente */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">Enviar recibo manualmente</p>

                {/* Teléfono + WhatsApp */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <span className="block text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">Teléfono</span>
                    <span className="block text-sm text-gray-700 dark:text-slate-200 truncate">{patient_phone || 'Sin teléfono'}</span>
                  </div>
                  {patient_phone && (
                    <>
                      <Button
                        size="sm" variant="outline" className="shrink-0 h-9 gap-1.5"
                        onClick={() => copy(patient_phone, 'tel')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copied === 'tel' ? 'Copiado' : 'Copiar'}
                      </Button>
                      <a
                        href={waLink}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 shrink-0 h-9 px-3 rounded-md text-sm font-medium border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    </>
                  )}
                </div>

                {/* Correo */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                    <span className="block text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">Correo</span>
                    <span className="block text-sm text-gray-700 dark:text-slate-200 truncate">{patient_email || 'Sin correo'}</span>
                  </div>
                  {patient_email && (
                    <Button
                      size="sm" variant="outline" className="shrink-0 h-9 gap-1.5"
                      onClick={() => copy(patient_email, 'mail')}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied === 'mail' ? 'Copiado' : 'Copiar'}
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-gray-400 dark:text-slate-500 leading-snug">
                  WhatsApp abre el chat con el mensaje ya escrito; solo presiona enviar.
                  Para mandar el PDF, descárgalo y adjúntalo.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar ── */}
      <Dialog open={editarOpen} onOpenChange={setEditarOpen}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-slate-100">Editar servicio</DialogTitle>
            <DialogDescription className="text-gray-400 dark:text-slate-500">El historial de pagos no se modifica</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="text" placeholder="Nombre del servicio"
              value={editName} onChange={e => setEditName(e.target.value)} className="text-sm" />
            <Input type="number" placeholder="Precio"
              value={editPrice} onChange={e => setEditPrice(e.target.value)} min={1} className="text-sm" />
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <Button variant="outline" size="sm" onClick={() => setEditarOpen(false)}>Cancelar</Button>
            <Button size="sm" disabled={editLoading}
              className="bg-sky-500 hover:bg-sky-600 text-white" onClick={handleEditar}>
              {editLoading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Historial ── */}
      <Dialog open={historialOpen} onOpenChange={closeHistorial}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-slate-100">Historial de pagos</DialogTitle>
            <DialogDescription className="text-gray-400 dark:text-slate-500">
              {name} — {patient_name}
            </DialogDescription>
          </DialogHeader>

          {historialLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-6">Sin pagos registrados</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {payments.map((p, i) => {
                  const isLast = i === payments.length - 1
                  return (
                    <div key={p.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${isLast
                        ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800'
                        : 'bg-gray-50 dark:bg-slate-700/50'}`}
                    >
                      <div>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm font-bold text-gray-800 dark:text-slate-100">
                          {fmt(p.abono)}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500">
                          {METODO_PAGO_LABELS[p.metodo_pago ?? 'efectivo']}
                          {p.registrado_por_nombre && ` · Cobró: ${p.registrado_por_nombre}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLast && (
                          <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 rounded-full">
                            Último
                          </span>
                        )}
                        <a
                          href={`/api/payment-history/receipt/${p.id}`}
                          download={`recibo-${p.id}.pdf`}
                          title="Descargar recibo"
                          className="text-gray-400 hover:text-sky-500 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Editar último abono</p>
                <div className="flex gap-2">
                  <Input
                    type="number" value={editingAbono}
                    onChange={e => setEditingAbono(e.target.value)}
                    min={0.01} className="text-sm h-9"
                  />
                  <Button size="sm" disabled={editAbonoLoading}
                    className="bg-sky-500 hover:bg-sky-600 text-white shrink-0 h-9"
                    onClick={handleEditLastAbono}>
                    {editAbonoLoading ? "…" : "Actualizar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
