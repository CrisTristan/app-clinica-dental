"use client"

import { useState, useEffect } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users, Calendar, FileText, Plus, Search,
  ChevronRight, X, ClipboardList, UserCog,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Patient } from '../types/types'
import DeleteButtonNotify from './deleteButtonNotify'
import AdministradorAnuncios from './AdministradorAnuncios'
import ProximasCitas from './proximasCitas'
import CatalogoServicios from './CatalogoServicios'
import GestionColaboradores from './GestionColaboradores'

/* ── Helpers ── */
function initials(name: string, ap?: string) {
  return `${name?.[0] ?? ""}${ap?.[0] ?? ""}`.toUpperCase() || "?"
}

function fmt(date?: string) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

/* ── Nav items ── */
const NAV = [
  { id: "Pacientes",       label: "Pacientes",        icon: Users       },
  { id: "Proximas Citas",  label: "Próximas Citas",   icon: Calendar    },
  { id: "Anuncios",        label: "Anuncios",         icon: FileText    },
  { id: "Catalogo",        label: "Catálogo",         icon: ClipboardList },
  { id: "Colaboradores",   label: "Colaboradores",    icon: UserCog     },
]

/* ── Sidebar item ── */
function SidebarItem({
  item, active, onClick,
}: {
  item: typeof NAV[0]; active: boolean; onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
        ${active
          ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm"
          : "text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-800 dark:hover:text-slate-100"
        }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
      {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
    </button>
  )
}

export default function PatientManagement() {
  const [patients,        setPatients]        = useState<Patient[]>([])
  const [pendingCountMap, setPendingCountMap] = useState<Map<number, number>>(new Map())
  const [currentPage,     setCurrentPage]     = useState("Pacientes")
  const [searchTerm,      setSearchTerm]      = useState("")
  const [checkedItems,    setCheckedItems]    = useState<string[]>([])
  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [dialogOpen,      setDialogOpen]      = useState(false)

  const [newPatient, setNewPatient] = useState({
    name: "", telefono: "998", apellido_pat: "", apellido_mat: "", email: "",
  })
  const [errorName,  setErrorName]  = useState("")
  const [errorPhone, setErrorPhone] = useState("")
  const [errorEmail, setErrorEmail] = useState("")
  const [errorSave,  setErrorSave]  = useState(false)

  const router = useRouter()

  /* ── Fetch patients + pending counts ── */
  useEffect(() => {
    fetch("/patients/api")
      .then(r => r.json()).then(setPatients).catch(console.error)

    fetch("/api/patient-services")
      .then(r => r.json())
      .then((rows: { patient_id: number; balance: number }[]) => {
        const map = new Map<number, number>()
        rows.forEach(ps => {
          if ((ps.balance ?? 0) > 0)
            map.set(ps.patient_id, (map.get(ps.patient_id) ?? 0) + 1)
        })
        setPendingCountMap(map)
      })
      .catch(console.error)
  }, [])


  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.telefono.includes(searchTerm)
  )

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target
    setCheckedItems(prev => checked ? [...prev, id] : prev.filter(i => i !== id))
  }

  const handleDelete = async () => {
    try {
      const res = await fetch("/patients/api", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: checkedItems }),
      })
      if (!res.ok) throw new Error()
      setPatients(prev => prev.filter(p => !checkedItems.map(Number).includes(p.id)))
      setCheckedItems([])
    } catch { console.error("Error al eliminar") }
  }

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewPatient(prev => ({ ...prev, [name]: value }))
    if (name === "name") {
      setErrorName(/^[A-Za-záéíóúÁÉÍÓÚñÑ]+ ?[A-Za-záéíóúÁÉÍÓÚñÑ]+$/.test(value) ? "" : "Solo letras y un espacio")
    }
    if (name === "telefono") {
      setErrorPhone(/^\d+$/.test(value) ? "" : "Solo dígitos")
    }
    if (name === "email") {
      // El correo es opcional: vacío es válido; si hay texto, valida el formato.
      setErrorEmail(value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Correo no válido")
    }
  }

  const handleSave = () => {
    if (errorName || errorPhone || errorEmail) return
    if (newPatient.telefono.length < 10) { setErrorPhone("10 dígitos requeridos"); return }

    fetch("/patients/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPatient.name,
        phone: newPatient.telefono,
        apellidoPat: newPatient.apellido_pat,
        apellidoMat: newPatient.apellido_mat,
        email: newPatient.email.trim() || null,
      }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(() => {
        setDialogOpen(false)
        setErrorSave(false)
        setNewPatient({ name: "", telefono: "998", apellido_pat: "", apellido_mat: "", email: "" })
        location.reload()
      })
      .catch(() => setErrorSave(true))
  }

  const activeLabel = NAV.find(n => n.id === currentPage)?.label ?? currentPage

  /* ── Sidebar content (shared between desktop & mobile) ── */
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-5 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shrink-0 overflow-hidden">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1C9.6 1 7.5 2.3 6.3 4.2 5.4 3.8 4.5 3.5 3.5 3.5 1.6 3.5 0 5.1 0 7c0 1.6 1 3 2.5 3.5.1 1.5.4 3 1 4.4.8 2.3 1.9 4.4 2.6 6.4.5 1.3 1.6 2.2 2.9 2.2s2.4-1 2.9-2.2l.5-1.7c.3-1 .5-1.5.6-1.5s.3.5.6 1.5l.5 1.7c.5 1.3 1.6 2.2 2.9 2.2s2.4-1 2.9-2.2c.7-2 1.8-4.1 2.6-6.4.6-1.4.9-2.9 1-4.4C23 9.9 24 8.6 24 7c0-1.9-1.6-3.5-3.5-3.5-1 0-1.9.3-2.8.7C16.5 2.3 14.4 1 12 1z" />
          </svg>
        </div>
        <div className="leading-tight">
          <span className="block text-sm font-bold text-gray-800 dark:text-slate-100">Clínica Dental</span>
          <span className="block text-[10px] text-gray-400 dark:text-slate-500">Panel Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-slate-600 uppercase tracking-widest px-3 mb-2">Módulos</p>
        {NAV.map(item => (
          <SidebarItem
            key={item.id}
            item={item}
            active={currentPage === item.id}
            onClick={() => { setCurrentPage(item.id); setSidebarOpen(false) }}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-slate-700">
        <p className="text-[10px] text-gray-400 dark:text-slate-600 text-center">
          © {new Date().getFullYear()} Clínica Dental
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 shadow-sm shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 flex flex-col w-64 bg-white dark:bg-slate-800 shadow-xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={() => setSidebarOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800 dark:text-slate-100">{activeLabel}</h1>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {currentPage === "Pacientes"
                  ? `${filteredPatients.length} paciente${filteredPatients.length !== 1 ? "s" : ""}`
                  : "Panel de administración"}
              </p>
            </div>
          </div>

          {/* Badge de módulo activo */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Administrador
          </span>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">

          {/* ── Pacientes ── */}
          {currentPage === "Pacientes" && (
            <div className="space-y-4">

              {/* Actions bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o teléfono…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 h-10 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                               bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100
                               placeholder:text-gray-400 dark:placeholder:text-slate-500
                               focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {checkedItems.length > 0 && (
                    <DeleteButtonNotify onDelete={handleDelete} text="Eliminar" size="default" />
                  )}
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <button
                        onClick={() => { setDialogOpen(true); setCheckedItems([]) }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                                   bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                                   rounded-xl shadow-sm transition-all"
                      >
                        <Plus className="w-4 h-4" /> Nuevo Paciente
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[420px] bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-gray-800 dark:text-slate-100">Nuevo Paciente</DialogTitle>
                        <DialogDescription className="text-gray-400 dark:text-slate-500">
                          Completa los datos para registrar al paciente.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        {[
                          { label: "Nombre",           field: "name",         ph: "Nombre(s)" },
                          { label: "Apellido Paterno", field: "apellido_pat", ph: "Apellido paterno" },
                          { label: "Apellido Materno", field: "apellido_mat", ph: "Apellido materno" },
                          { label: "Teléfono",         field: "telefono",     ph: "10 dígitos" },
                          { label: "Correo (opcional)", field: "email",       ph: "correo@ejemplo.com" },
                        ].map(({ label, field, ph }) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600 dark:text-slate-300">{label}</Label>
                            <Input
                              name={field}
                              value={newPatient[field as keyof typeof newPatient]}
                              onChange={handleFieldChange}
                              placeholder={ph}
                              className="h-9"
                            />
                            {field === "name"     && errorName  && <p className="text-xs text-red-500">{errorName}</p>}
                            {field === "telefono" && errorPhone && <p className="text-xs text-red-500">{errorPhone}</p>}
                            {field === "email"    && errorEmail && <p className="text-xs text-red-500">{errorEmail}</p>}
                          </div>
                        ))}
                        {errorSave && (
                          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800">
                            El teléfono {newPatient.telefono} ya existe en el sistema.
                          </p>
                        )}
                      </div>
                      <DialogFooter>
                        <button
                          onClick={() => setDialogOpen(false)}
                          className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 rounded-lg shadow-sm transition-all"
                        >
                          Guardar
                        </button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <TableHead className="w-10" />
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Paciente</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Teléfono</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Última Visita</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Próxima Cita</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide text-center">Servicios</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-16 text-gray-400 dark:text-slate-500">
                          {searchTerm ? `Sin resultados para "${searchTerm}"` : "No hay pacientes registrados"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients.map((patient) => {
                        const { id, name, apellido_pat, apellido_mat, telefono } = patient
                        const appts   = (patient as any).Appointment as { startDate: string }[] | undefined
                        const hoy     = new Date()
                        const ultima  = appts?.filter(a => new Date(a.startDate) < hoy) ?? []
                        const proxima = appts?.filter(a => new Date(a.startDate) > hoy) ?? []
                        const fullName = [name, apellido_pat, apellido_mat].filter(Boolean).join(" ")
                        const pending  = pendingCountMap.get(id) ?? 0

                        return (
                          <TableRow
                            key={id}
                            className="border-gray-50 dark:border-slate-700 hover:bg-sky-50/50 dark:hover:bg-slate-700/50 transition-colors group"
                          >
                            <TableCell className="w-10">
                              <input
                                id={String(id)}
                                type="checkbox"
                                checked={checkedItems.includes(String(id))}
                                onChange={handleCheckbox}
                                className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 accent-sky-500"
                              />
                            </TableCell>

                            <TableCell
                              onClick={() => router.push(`/pacientes/${encodeURIComponent(id)}/?id=${id}&name=${name}`)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-xs font-bold shrink-0 overflow-hidden">
                                  <span className="leading-none">{initials(name, apellido_pat)}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                  {fullName}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell
                              onClick={() => router.push(`/pacientes/${encodeURIComponent(id)}/?id=${id}&name=${name}`)}
                              className="cursor-pointer text-sm text-gray-500 dark:text-slate-400"
                            >
                              {telefono}
                            </TableCell>

                            <TableCell
                              onClick={() => router.push(`/pacientes/${encodeURIComponent(id)}/?id=${id}&name=${name}`)}
                              className="cursor-pointer text-sm text-gray-500 dark:text-slate-400"
                            >
                              {fmt(ultima[ultima.length - 1]?.startDate)}
                            </TableCell>

                            <TableCell
                              onClick={() => router.push(`/pacientes/${encodeURIComponent(id)}/?id=${id}&name=${name}`)}
                              className="cursor-pointer text-sm text-gray-500 dark:text-slate-400"
                            >
                              {fmt(proxima[proxima.length - 1]?.startDate)}
                            </TableCell>

                            <TableCell className="text-center">
                              {pending > 0 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
                                  {pending}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold">
                                  ✓
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredPatients.length > 0 && (
                <p className="text-xs text-gray-400 dark:text-slate-500 text-right">
                  {filteredPatients.length} paciente{filteredPatients.length !== 1 ? "s" : ""}
                  {searchTerm && ` · búsqueda: "${searchTerm}"`}
                </p>
              )}
            </div>
          )}

          {currentPage === "Anuncios"       && <AdministradorAnuncios />}
          {currentPage === "Catalogo"       && <CatalogoServicios />}
          {currentPage === "Proximas Citas" && <ProximasCitas />}
          {currentPage === "Colaboradores"  && <GestionColaboradores />}

        </div>
      </main>
    </div>
  )
}
