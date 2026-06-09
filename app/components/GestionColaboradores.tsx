"use client"

import { registerAction } from "@/app/actions/auth-actions"
import { ROLE_LABELS, type Role } from "@/lib/roles"
import { useState, useEffect, useTransition } from "react"
import { UserPlus, Trash2, Pencil, X, Check, Shield, Stethoscope, ClipboardList } from "lucide-react"

type Colaborador = {
  id: string
  email: string
  phone: string | null
  role: Role | null
  nombre: string | null
  created_at: string
}

const ROLES: Role[] = ['admin', 'recepcionista', 'dentista']

const ROLE_ICON: Record<string, React.ReactNode> = {
  admin:         <Shield        className="w-3 h-3" />,
  dentista:      <Stethoscope   className="w-3 h-3" />,
  recepcionista: <ClipboardList className="w-3 h-3" />,
}

const ROLE_COLOR: Record<string, string> = {
  admin:         "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  dentista:      "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  recepcionista: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
}

function RoleBadge({ role }: { role: Role | null }) {
  if (!role) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600">
      Sin rol
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLOR[role] ?? ""}`}>
      {ROLE_ICON[role]}
      {ROLE_LABELS[role]}
    </span>
  )
}

export default function GestionColaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editRole, setEditRole]           = useState<Role>('recepcionista')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isPending, startTransition]      = useTransition()

  const [form, setForm]           = useState({ name: '', email: '', phone: '', password: '', role: 'recepcionista' as Role })
  const [formError, setFormError]   = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const fetchColaboradores = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setColaboradores(data.filter((u: Colaborador) => u.role !== null))
    } catch (e: unknown) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchColaboradores() }, [])

  const handleAdd = () => {
    setFormError(null)
    setFormSuccess(null)
    startTransition(async () => {
      const result = await registerAction({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      })
      if (result.error) { setFormError(result.error); return }

      const userId = (result as { userId: string }).userId
      if (!userId) { setFormError('No se pudo obtener el ID del usuario'); return }

      // Asignar rol y guardar nombre en profiles
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: form.role, nombre: form.name }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error); return }

      setFormSuccess(`${form.name} registrado como ${ROLE_LABELS[form.role]}`)
      setForm({ name: '', email: '', phone: '', password: '', role: 'recepcionista' })
      setShowForm(false)
      fetchColaboradores()
    })
  }

  const handleChangeRole = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: editRole }),
    })
    if (res.ok) { setEditingId(null); fetchColaboradores() }
  }

  const handleRevoke = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) { setConfirmDelete(null); fetchColaboradores() }
  }

  return (
    <div className="space-y-5">

      {/* Encabezado de sección */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {colaboradores.length} colaborador{colaboradores.length !== 1 ? 'es' : ''} activo{colaboradores.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => { setShowForm(f => !f); setFormError(null); setFormSuccess(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                     bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                     shadow-sm transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Nuevo colaborador'}
        </button>
      </div>

      {/* Mensaje de éxito flotante */}
      {formSuccess && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
          {formSuccess}
        </p>
      )}

      {/* Formulario nuevo colaborador */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-sky-500" />
            Registrar nuevo colaborador
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Nombre completo',     key: 'name',     type: 'text',     ph: 'Ej. María García',      required: true  },
              { label: 'Correo electrónico',  key: 'email',    type: 'email',    ph: 'correo@ejemplo.com',    required: true  },
              { label: 'Teléfono',            key: 'phone',    type: 'tel',      ph: '+521234567890',         required: false },
              { label: 'Contraseña temporal', key: 'password', type: 'password', ph: 'Mínimo 8 caracteres',  required: true  },
            ].map(({ label, key, type, ph, required }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  {label}
                  {!required && <span className="ml-1 text-gray-400 dark:text-slate-500 font-normal">(opcional)</span>}
                </label>
                <input
                  type={type}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full h-9 px-3 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                             bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                             focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full h-9 px-3 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                           bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
              >
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={isPending || !form.name || !form.email || !form.password}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white
                         bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                         disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {isPending
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Check className="w-4 h-4" />}
              {isPending ? 'Registrando…' : 'Registrar colaborador'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : colaboradores.length === 0 ? (
          <p className="text-center text-xs text-gray-400 dark:text-slate-500 py-10">
            No hay colaboradores registrados
          </p>
        ) : (
          <ul className="divide-y divide-gray-50 dark:divide-slate-700">
            {colaboradores.map(colab => (
              <li key={colab.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-sm font-bold shrink-0">
                  {(colab.nombre ?? colab.email)?.[0]?.toUpperCase() ?? '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                    {colab.nombre ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{colab.email}</p>
                  {colab.phone && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{colab.phone}</p>
                  )}
                </div>

                {/* Rol + acciones */}
                {editingId === colab.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value as Role)}
                      className="h-8 px-2 text-xs rounded-lg border border-gray-200 dark:border-slate-600
                                 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                                 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                    <button onClick={() => handleChangeRole(colab.id)} title="Confirmar"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} title="Cancelar"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-400 hover:bg-gray-200 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <RoleBadge role={colab.role} />
                    <button
                      onClick={() => { setEditingId(colab.id); setEditRole(colab.role ?? 'recepcionista') }}
                      title="Cambiar rol"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {confirmDelete === colab.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-red-500">¿Revocar?</span>
                        <button onClick={() => handleRevoke(colab.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirmDelete(null)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-400 hover:bg-gray-200 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(colab.id)}
                        title="Revocar acceso"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
