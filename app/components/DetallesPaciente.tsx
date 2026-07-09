"use client"

import { useState, useEffect, useMemo } from "react"
import { ChevronDown, IdCard, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import SearchableSelect from "./SearchableSelect"

type Estado = { catalog_key: string; entidad_federativa: string }
type Nacionalidad = { codigo_pais: number; pais: string }
type Municipio = { catalog_key: string; municipio: string }
type Localidad = { cve_loc: string; nomgeo: string }

type Details = {
  curp: string
  edonac: string   // catalog_key de entidades_federativas
  nacorigen: string // codigo_pais de nacionalidades (numérico, como string en el form)
  edo: string      // catalog_key de entidades_federativas
  mun: string      // catalog_key de municipios
  loc: string
}

const EMPTY: Details = { curp: "", edonac: "", nacorigen: "", edo: "", mun: "", loc: "" }

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
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [locName, setLocName] = useState("")      // nombre (nomgeo) de la localidad guardada
  const [locLoading, setLocLoading] = useState(false)
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

  // La lista de localidades depende de estado + municipio; se recarga bajo
  // demanda (al abrir el select) para no consultar INEGI de más.
  useEffect(() => { setLocalidades([]) }, [details.edo, details.mun])

  // Nombre real (nomgeo) de la localidad guardada. Si ya está en la lista
  // cargada la tomamos de ahí; si no, se consulta INEGI con las claves
  // concatenadas (cve_ent+cve_mun+cve_loc).
  useEffect(() => {
    if (!details.edo || !details.mun || !details.loc) { setLocName(""); return }
    const enLista = localidades.find(l => l.cve_loc === details.loc)
    if (enLista) { setLocName(enLista.nomgeo); return }
    const params = new URLSearchParams({ edo: details.edo, mun: details.mun, loc: details.loc })
    fetch(`/api/patient-details/localidades?${params}`)
      .then(r => r.json())
      .then(d => setLocName(d.nomgeo ?? ""))
      .catch(console.error)
  }, [details.edo, details.mun, details.loc, localidades])

  const loadLocalidades = () => {
    if (!details.edo || !details.mun || localidades.length || locLoading) return
    setLocLoading(true)
    const params = new URLSearchParams({ edo: details.edo, mun: details.mun })
    fetch(`/api/patient-details/localidades?${params}`)
      .then(r => r.json())
      .then(d => setLocalidades(d.localidades ?? []))
      .catch(console.error)
      .finally(() => setLocLoading(false))
  }

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setDetails(prev => ({ ...prev, [name]: value }))
  }

  const setField = (name: keyof Details, value: string) => {
    setDetails(prev => {
      // Cambiar de estado invalida municipio y localidad; cambiar de
      // municipio invalida la localidad.
      if (name === "edo") return { ...prev, edo: value, mun: "", loc: "" }
      if (name === "mun") return { ...prev, mun: value, loc: "" }
      return { ...prev, [name]: value }
    })
  }

  const estadoOpts = useMemo(
    () => estados.map(e => ({ value: e.catalog_key, label: e.entidad_federativa })),
    [estados],
  )
  const nacionalidadOpts = useMemo(
    () => nacionalidades.map(n => ({ value: String(n.codigo_pais), label: n.pais })),
    [nacionalidades],
  )
  const municipioOpts = useMemo(
    () => municipios.map(m => ({ value: m.catalog_key, label: m.municipio })),
    [municipios],
  )
  const localidadOpts = useMemo(
    () => localidades.map(l => ({ value: l.cve_loc, label: l.nomgeo })),
    [localidades],
  )

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch("/api/patient-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: Number(id), ...details }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || `Error ${res.status}`)
      }
      toast({ title: "Detalles del paciente guardados" })
    } catch (e) {
      toast({
        title: "Error al guardar los detalles",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-visible">
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

              {/* Estado de nacimiento */}
              <div className="space-y-1">
                <label className={labelClass}>Estado de Nacimiento</label>
                <SearchableSelect
                  name="edonac"
                  options={estadoOpts}
                  value={details.edonac}
                  onChange={v => setField("edonac", v)}
                  placeholder="Buscar estado…"
                  direction="up"
                />
              </div>

              {/* Nacionalidad */}
              <div className="space-y-1">
                <label className={labelClass}>Nacionalidad</label>
                <SearchableSelect
                  name="nacorigen"
                  options={nacionalidadOpts}
                  value={details.nacorigen}
                  onChange={v => setField("nacorigen", v)}
                  placeholder="Buscar nacionalidad…"
                  direction="up"
                />
              </div>

              {/* Estado (domicilio) */}
              <div className="space-y-1">
                <label className={labelClass}>Estado</label>
                <SearchableSelect
                  name="edo"
                  options={estadoOpts}
                  value={details.edo}
                  onChange={v => setField("edo", v)}
                  placeholder="Buscar estado…"
                  direction="up"
                />
              </div>

              {/* Municipio */}
              <div className="space-y-1">
                <label className={labelClass}>Municipio</label>
                <SearchableSelect
                  name="mun"
                  options={municipioOpts}
                  value={details.mun}
                  onChange={v => setField("mun", v)}
                  disabled={!details.edo}
                  placeholder={details.edo ? "Buscar municipio…" : "Seleccione un estado primero"}
                  direction="up"
                />
              </div>

              {/* Localidad — catálogo de INEGI (se guarda la clave cve_loc) */}
              <div className="space-y-1">
                <label className={labelClass}>Localidad</label>
                <SearchableSelect
                  name="loc"
                  options={localidadOpts}
                  value={details.loc}
                  onChange={v => setField("loc", v)}
                  onOpen={loadLocalidades}
                  loading={locLoading}
                  displayLabel={locName}
                  disabled={!details.edo || !details.mun}
                  placeholder={details.edo && details.mun ? "Buscar localidad…" : "Seleccione estado y municipio"}
                  direction="up"
                />
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
