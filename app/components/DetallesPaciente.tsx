"use client"

import { useState, useEffect } from "react"
import { ChevronDown, IdCard, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"

type Estado = { catalog_key: string; entidad_federativa: string }
type Nacionalidad = { codigo_pais: number; pais: string }
type Municipio = { catalog_key: string; municipio: string }

type Details = {
  curp: string
  edonac: string   // catalog_key de entidades_federativas
  nacorigen: string // codigo_pais de nacionalidades (numérico, como string en el form)
  edo: string      // catalog_key de entidades_federativas
  mun: string      // catalog_key de municipios
  loc: string
}

const EMPTY: Details = { curp: "", edonac: "", nacorigen: "", edo: "", mun: "", loc: "" }

const selectClass =
  "w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-slate-600 " +
  "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 " +
  "focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"

const labelClass =
  "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide"

export default function DetallesPaciente({
  id, disabled = false,
}: {
  id: string | null
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [details, setDetails] = useState<Details>(EMPTY)
  const [estados, setEstados] = useState<Estado[]>([])
  const [nacionalidades, setNacionalidades] = useState<Nacionalidad[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [saving, setSaving] = useState(false)

  // Catálogos base (estados + nacionalidades) y datos ya capturados.
  useEffect(() => {
    fetch("/api/patient-details/catalogs")
      .then(r => r.json())
      .then(d => {
        setEstados(d.estados ?? [])
        setNacionalidades(d.nacionalidades ?? [])
      })
      .catch(console.error)

    if (!id) return
    fetch(`/api/patient-details?id=${id}`)
      .then(r => r.json())
      .then(d => {
        if (!d) return
        setDetails({
          curp: d.curp ?? "",
          edonac: d.edonac ?? "",
          nacorigen: d.nacorigen != null ? String(d.nacorigen) : "",
          edo: d.edo ?? "",
          mun: d.mun ?? "",
          loc: d.loc ?? "",
        })
      })
      .catch(console.error)
  }, [id])

  // Los municipios dependen del estado (edo) seleccionado.
  useEffect(() => {
    if (!details.edo) { setMunicipios([]); return }
    fetch(`/api/patient-details/catalogs?municipios=${encodeURIComponent(details.edo)}`)
      .then(r => r.json())
      .then(d => setMunicipios(d.municipios ?? []))
      .catch(console.error)
  }, [details.edo])

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setDetails(prev => {
      // Al cambiar de estado, el municipio previo deja de ser válido.
      if (name === "edo") return { ...prev, edo: value, mun: "" }
      return { ...prev, [name]: value }
    })
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch("/api/patient-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: Number(id), ...details }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Detalles del paciente guardados" })
    } catch {
      toast({ title: "Error al guardar los detalles", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Cabecera expandible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-slate-700 hover:bg-gray-50/60 dark:hover:bg-slate-700/40 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
          <IdCard className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Detalles del Paciente</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
            CURP, entidad de nacimiento, nacionalidad y domicilio
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Contenido desplegable */}
      {open && (
        <div className="p-5">
          <fieldset disabled={disabled} className="contents">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CURP */}
              <div className="space-y-1">
                <label className={labelClass}>CURP</label>
                <Input
                  name="curp"
                  value={details.curp}
                  onChange={handle}
                  placeholder="Ingresar CURP"
                  maxLength={18}
                  className="h-9 text-sm uppercase"
                />
              </div>

              {/* Localidad */}
              <div className="space-y-1">
                <label className={labelClass}>Localidad</label>
                <Input
                  name="loc"
                  value={details.loc}
                  onChange={handle}
                  placeholder="Ingresar localidad"
                  className="h-9 text-sm"
                />
              </div>

              {/* Estado de nacimiento */}
              <div className="space-y-1">
                <label className={labelClass}>Estado de Nacimiento</label>
                <select name="edonac" value={details.edonac} onChange={handle} className={selectClass}>
                  <option value="">— Seleccionar —</option>
                  {estados.map(e => (
                    <option key={e.catalog_key} value={e.catalog_key}>{e.entidad_federativa}</option>
                  ))}
                </select>
              </div>

              {/* Nacionalidad */}
              <div className="space-y-1">
                <label className={labelClass}>Nacionalidad</label>
                <select name="nacorigen" value={details.nacorigen} onChange={handle} className={selectClass}>
                  <option value="">— Seleccionar —</option>
                  {nacionalidades.map(n => (
                    <option key={n.codigo_pais} value={n.codigo_pais}>{n.pais}</option>
                  ))}
                </select>
              </div>

              {/* Estado (domicilio) */}
              <div className="space-y-1">
                <label className={labelClass}>Estado</label>
                <select name="edo" value={details.edo} onChange={handle} className={selectClass}>
                  <option value="">— Seleccionar —</option>
                  {estados.map(e => (
                    <option key={e.catalog_key} value={e.catalog_key}>{e.entidad_federativa}</option>
                  ))}
                </select>
              </div>

              {/* Municipio */}
              <div className="space-y-1">
                <label className={labelClass}>Municipio</label>
                <select
                  name="mun"
                  value={details.mun}
                  onChange={handle}
                  disabled={!details.edo}
                  className={`${selectClass} ${!details.edo ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <option value="">
                    {details.edo ? "— Seleccionar —" : "Seleccione un estado primero"}
                  </option>
                  {municipios.map(m => (
                    <option key={m.catalog_key} value={m.catalog_key}>{m.municipio}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-50 dark:border-slate-700">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || disabled}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                           bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                           rounded-xl shadow-sm transition-all disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando…" : "Guardar detalles"}
              </button>
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
