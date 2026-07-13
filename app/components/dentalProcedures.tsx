'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Stethoscope } from 'lucide-react'

type Procedure = { key: string; nombre: string }
type Filter = 'clinicos' | 'normativos'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'clinicos',   label: 'Clínicos'   },
  { id: 'normativos', label: 'Normativos' },
]

// Normaliza para buscar sin acentos ni mayúsculas.
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()

export default function DentalProcedures() {
  const [filter, setFilter] = useState<Filter>('clinicos')
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    const endpoint = filter === 'clinicos' ? '/api/clinic-procedures' : '/api/dental-procedures'

    fetch(endpoint)
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? `Error ${r.status}`)
        return data
      })
      .then((data: { procedures: { id?: number; catalog_key?: string; nombre: string }[] }) => {
        setProcedures(
          (data.procedures ?? []).map((p, i) => ({
            key: String(p.id ?? p.catalog_key ?? i),
            nombre: p.nombre,
          })),
        )
      })
      .catch(err => setError(err.message ?? 'No se pudieron cargar los procedimientos.'))
      .finally(() => setLoading(false))
  }, [filter])

  const filtered = useMemo(() => {
    const q = norm(searchTerm)
    if (!q) return procedures
    return procedures.filter(p => norm(p.nombre).includes(q))
  }, [procedures, searchTerm])

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm shrink-0">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Procedimientos</h1>
          {filter === 'clinicos' ? (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Catálogo de procedimientos dentales disponibles en la clínica.
              (procedimientos que ofrece la clínica, que pueden ser realizados por el personal clínico de la clínica)
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Catálogo de procedimientos dentales segun la el catalogo definido por el Centro Colaborador para la Familia de Clasificaciones Internacionales de la OMS en México (CEMECE).
            </p>
          )}
        </div>
      </div>

      {/* Filtro clínicos / normativos */}
      <div className="mt-6 inline-flex p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-100 dark:border-slate-700">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all
              ${filter === f.id
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100'
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative mt-4 mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
        <input
          type="text"
          placeholder="Buscar procedimiento…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 h-9 text-sm rounded-xl border border-gray-200 dark:border-slate-600
                     bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                     placeholder:text-gray-400 dark:placeholder:text-slate-500
                     focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-sm text-red-500 dark:text-red-400 py-12">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Stethoscope className="w-8 h-8 text-gray-200 dark:text-slate-700 mb-2" />
          <p className="text-sm text-gray-400 dark:text-slate-500">
            {searchTerm ? `Sin resultados para "${searchTerm}"` : 'No hay procedimientos en el catálogo.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(proc => (
            <div
              key={proc.key}
              className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-slate-700
                         bg-white dark:bg-slate-800 shadow-sm hover:border-sky-200 dark:hover:border-sky-800 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 grid place-items-center shrink-0">
                <Stethoscope className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <span className="text-sm font-medium text-gray-800 dark:text-slate-100">{proc.nombre}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 text-right mt-4">
          {filtered.length} procedimiento{filtered.length !== 1 ? 's' : ''}
          {searchTerm && ` · "${searchTerm}"`}
        </p>
      )}
    </div>
  )
}
