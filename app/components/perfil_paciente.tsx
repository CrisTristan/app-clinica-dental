"use client"

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { X, Save, Camera, Upload, ArrowLeft, User, Phone, MapPin, Calendar, Mail, Stethoscope, ClipboardList, Activity, Heart, Droplets, Apple, FileImage, Pencil, Check, Square, Minus } from "lucide-react"
import { Patient } from '../types/types'
import { getProfilePhoto } from '../actions/getProfilePhoto'
import { CldUploadWidget } from "next-cloudinary"
import { getAllPatientImages, type PatientFile } from '../actions/getAllImages'
import { deleteOneImage } from '../actions/deleteOneImage'
import { renameOneImage } from '../actions/renameOneImage'
import DeleteButtonNotify from './deleteButtonNotify'
import ExamenTejidos from "./DentalData/ExamenTejitos"
import HabitosForm from "./DentalData/HabitosForm"
import EnfermedadesPersonales from './DentalData/EnfermedaesPersonales'
import MotivoConsulta from './DentalData/MotivoConsulta'
import HigieneBucal from './DentalData/HigieneBucal'
import Alergias from './DentalData/Alergias'
import Alimentacion from './DentalData/Alimentacion'
import { useRouter } from 'next/navigation'
import DetallesPaciente from './DetallesPaciente'
import OdontogramaCanvas from '../odontograma/OdontogramaCanvas'
import { authentication } from '../actions/authentication'
import { can } from '@/lib/permissions'

/* ── Field map: key → Spanish label ── */
const FIELD_LABELS: Record<string, string> = {
  nombre: "Nombre",
  apellido_pat: "Apellido Paterno",
  apellido_mat: "Apellido Materno",
  telefono: "Teléfono",
  edad: "Edad",
  email: "Correo Electrónico",
  domicilio: "Domicilio",
  sexo: "Sexo",
  fechaNacimiento: "Fecha de Nacimiento",
}
const FIELD_ORDER = ["nombre","apellido_pat","apellido_mat","telefono","edad","email","domicilio","sexo","fechaNacimiento"] as const

/* ── Dental data section card ── */
function DentalCard({
  title, icon: Icon, description, children,
}: {
  title: string; icon: React.ElementType; description: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{title}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{description}</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <button className="shrink-0 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors">
              Ver / Editar
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-gray-800 dark:text-slate-100">
                <Icon className="w-4 h-4 text-sky-500" />
                {title}
              </DialogTitle>
              <DialogDescription className="text-gray-400 dark:text-slate-500">{description}</DialogDescription>
            </DialogHeader>
            {children}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

/* ── Section wrapper ── */
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

/* ── Tarjeta + modal de un archivo del expediente ── */
function ArchivoDialog({
  file, index, getPrivateAssetUrl, isPdfFile, onRename, onDelete,
}: {
  file: PatientFile
  index: number
  getPrivateAssetUrl: (file: PatientFile) => string
  isPdfFile: (file: PatientFile) => boolean
  onRename: (publicId: string, name: string) => Promise<void>
  onDelete: () => void
}) {
  const fallbackName = `Archivo ${index + 1}`
  const displayName = file.Name?.trim() || fallbackName

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [maximized, setMaximized] = useState(false)

  const startEditing = () => {
    setValue(file.Name?.trim() || "")
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const submit = async () => {
    const trimmed = value.trim()
    if (!trimmed || trimmed === (file.Name?.trim() || "")) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onRename(file.publicId, trimmed)
      setEditing(false)
    } catch (e) {
      console.error("No se pudo renombrar el archivo", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative cursor-pointer rounded-xl overflow-hidden border border-gray-100 dark:border-slate-700 hover:ring-2 hover:ring-sky-400 transition-all group">
          {isPdfFile(file) ? (
            <div className="relative h-32 bg-white dark:bg-slate-900">
              <iframe
                // Muestra la primera pagina del PDF sin capturar el click que abre el dialog.
                src={`${getPrivateAssetUrl(file)}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                title={`Vista previa ${displayName}`}
                className="pointer-events-none h-full w-full border-0 bg-white"
              />
              <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                PDF
              </span>
            </div>
          ) : (
            <Image
              src={getPrivateAssetUrl(file)}
              alt={displayName}
              width={200} height={200}
              unoptimized
              className="w-full h-32 object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-[11px] text-white">
            {displayName}
          </span>
        </div>
      </DialogTrigger>
      <DialogContent
        className={
          (maximized
            ? "w-screen max-w-none h-screen max-h-screen rounded-none sm:rounded-none overflow-y-auto"
            : "sm:max-w-3xl") +
          " bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700"
        }
      >
        {/* Controles de ventana estilo Windows (maximizar / restaurar), a la izquierda de la "X" */}
        <div className="absolute right-11 top-4 z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMaximized(true)}
            disabled={maximized}
            title="Pantalla completa"
            className="rounded-sm p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400 disabled:pointer-events-none disabled:opacity-30"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMaximized(false)}
            disabled={!maximized}
            title="Tamaño normal"
            className="rounded-sm p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-sky-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400 disabled:pointer-events-none disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <DialogHeader className="pr-28">
          <DialogTitle className="text-gray-800 dark:text-slate-100">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={value}
                  autoFocus
                  disabled={saving}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); submit() }
                    if (e.key === "Escape") { e.preventDefault(); cancelEditing() }
                  }}
                  className="h-8"
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving}
                  className="shrink-0 rounded-lg p-1.5 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/30 disabled:opacity-50"
                  title="Guardar nombre"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="truncate">{displayName}</span>
                <button
                  type="button"
                  onClick={startEditing}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sky-600 dark:hover:bg-slate-700 dark:hover:text-sky-400"
                  title="Editar nombre"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="relative">
          {isPdfFile(file) ? (
            <iframe
              // La ruta local valida permisos y redirige a una URL firmada para assets bloqueados.
              src={getPrivateAssetUrl(file)}
              title={displayName}
              className={`w-full rounded-xl border border-gray-100 dark:border-slate-700 ${maximized ? "h-[82vh]" : "h-[70vh]"}`}
            />
          ) : (
            <Image
              src={getPrivateAssetUrl(file)}
              alt={displayName}
              width={1200} height={900}
              unoptimized
              className={`w-full rounded-xl object-contain ${maximized ? "max-h-[82vh]" : "max-h-[65vh]"}`}
            />
          )}
        </div>
        <div className="flex justify-end pt-2">
          <DeleteButtonNotify
            onDelete={onDelete}
            nextAction={() => { }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ════════════════════════════════════════ */
export default function PerfilPaciente({
  paciente, nombre, id,
}: {
  paciente: Patient | undefined; nombre: string | null; id: string | null
}) {
  const router = useRouter()
  const pathFolder = `pacientes/${id}`

  const [patient,  setPatient]  = useState<Patient | undefined>()
  const [archivos, setArchivos] = useState<PatientFile[]>([])
  const [saved,    setSaved]    = useState(false)
  // La info clínica solo la edita admin/dentista; la recepcionista la ve en
  // modo solo lectura (el servidor también lo impone en las APIs clínicas).
  const [canEditClinical, setCanEditClinical] = useState(true)

  useEffect(() => {
    authentication().then(session =>
      setCanEditClinical(can(session?.user?.role, 'clinica.editar'))
    )
  }, [])

  useEffect(() => {
    if (!paciente) return
    setPatient(paciente)
    getProfilePhoto(nombre, id).then(patientFile => {
       const profile_photo= getPrivateAssetUrl(patientFile);
       console.log("Profile photo URL:", profile_photo);
       setPatient(prev => prev ? { ...prev, foto: profile_photo ?? '' } : prev)
    })
    getAllPatientImages(nombre, id).then(setArchivos)
  }, [paciente])

  const handleField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setPatient(prev => prev ? { ...prev, [name]: value } : prev)
  }

  const handleSave = async () => {

    await fetch("/patients/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: patient?.id,
        nombre: patient?.nombre,
        apellido_pat: patient?.apellido_pat,
        apellido_mat: patient?.apellido_mat,
        edad: patient?.edad,
        domicilio: patient?.domicilio,
        sexo: patient?.sexo,
        email: patient?.email,
        fechaNacimiento: patient?.fechaNacimiento,
      }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const fullName = [patient?.nombre, patient?.apellido_pat, patient?.apellido_mat]
    .filter(Boolean).join(" ") || nombre || "Paciente"

  const initials = [patient?.nombre?.[0], patient?.apellido_pat?.[0]]
    .filter(Boolean).join("").toUpperCase() || "?"

  const getPrivateAssetUrl = (file: PatientFile) => {
    const params = new URLSearchParams({
      public_id: file.publicId,
      format: file.format,
      resource_type: file.resourceType,
      type: file.type,
    })

    return `/api/cloudinary/private-asset?${params.toString()}`
  }

  const isPdfFile = (file: PatientFile) => {
    // Los PDFs autenticados no son imagenes; renderizarlos con next/image rompe la vista previa.
    return file.format.toLowerCase() === "pdf" || file.publicId.toLowerCase().endsWith(".pdf")
  }

  const handleRenameFile = async (publicId: string, name: string) => {
    const nuevoNombre = await renameOneImage(publicId, name)
    setArchivos(p => p.map(item =>
      item.publicId === publicId ? { ...item, Name: nuevoNombre } : item
    ))
  }

  if (!patient)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">

      {/* ── Back bar ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-4 sm:px-6 py-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Regresar al panel
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Hero ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Gradient strip */}
          <div className="h-24 bg-gradient-to-r from-sky-500 to-cyan-500" />

          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
              {/* Avatar / photo */}
              <div className="relative shrink-0">
                {patient.foto ? (
                  <Image
                    src={patient.foto}
                    alt={fullName}
                    width={96} height={96}
                    unoptimized
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-400 border-4 border-white dark:border-slate-800 shadow-md grid place-items-center text-white text-3xl font-bold overflow-hidden">
                    <span className="leading-none">{initials}</span>
                  </div>
                )}
                {/* Change photo widget */}
                <CldUploadWidget
                  signatureEndpoint="/api/sign-cloudinary-params"
                  options={{ sources: ["local", "camera", "url"], folder: `pacientes/${id}/fotoPerfil`, tags: ["perfil"] }}
                  onSuccess={
                    async (r) => {
                      if (!r.info || typeof r.info !== "object") return;
                      const info = r.info as any;

                      const response = await fetch(`/api/patients/${id}/files?kind=profile_photo`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ 
                          public_id: info.public_id,
                          resource_type: info.resource_type,
                          type: info.type ?? "upload",
                        })
                      });

                      if (!response.ok) {
                        console.error("No se pudo restringir el archivo")
                        return
                      }

                      const { asset } = await response.json() as { asset: PatientFile }

                      setPatient(prev => prev ? { ...prev, foto: getPrivateAssetUrl(asset) } : prev);
                    }
                  }
                >
                  {({ open }) => (
                    <button
                      onClick={() => open()}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-md transition-colors"
                      title="Cambiar foto"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </CldUploadWidget>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 mt-2 sm:mt-0">
                <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100 truncate">{fullName}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400 dark:text-slate-500">ID #{id}</span>
                  {patient.telefono && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                      <Phone className="w-3 h-3" />{patient.telefono}
                    </span>
                  )}
                  {patient.edad && (
                    <span className="text-xs text-gray-400 dark:text-slate-500">{patient.edad} años</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Datos personales ── */}
        <Section title="Datos Personales" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELD_ORDER.map(key => {
              const value = patient[key] ?? ''
              const label = FIELD_LABELS[key] ?? key
              const isDisabled = key === "telefono"

              return (
                <div key={key} className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                    {label}
                  </label>
                  {key === "sexo" ? (
                    <select
                      name="sexo"
                      value={value}
                      onChange={handleField}
                      className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 dark:border-slate-600
                                 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100
                                 focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors"
                    >
                      <option value="">— Seleccionar —</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  ) : (
                    <Input
                      name={key}
                      value={value}
                      onChange={handleField}
                      disabled={isDisabled}
                      placeholder={`Ingresar ${label.toLowerCase()}`}
                      className={`h-9 text-sm ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      type={key === "fechaNacimiento" ? "date" : key === "edad" ? "number" : "text"}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-50 dark:border-slate-700">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                         bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                         rounded-xl shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar cambios
            </button>
            {saved && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Cambios guardados
              </span>
            )}
          </div>
        </Section>

        {/* ── Detalles del paciente ── */}
        <DetallesPaciente id={id} />

        {/* ── Odontograma ── */}
        <Section title="Odontograma" icon={Stethoscope} className="overflow-visible">
          <div className="">
            {/* <Odontogram /> */}
            <fieldset disabled={!canEditClinical} className="contents"><OdontogramaCanvas /></fieldset>
          </div>
        </Section>

        {/* ── Historial clínico ── */}
        {(paciente?.historialClinico?.length ?? 0) > 0 && (
          <Section title="Historial Clínico" icon={Activity}>
            <ul className="space-y-2">
              {paciente?.historialClinico?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Datos dentales ── */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3 px-1">
            Datos Clínicos
            {!canEditClinical && (
              <span className="text-[10px] font-medium normal-case px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">
                Solo lectura
              </span>
            )}
          </h2>
          <div className="space-y-2">

            {/* Motivo consulta — inline (no dialog) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50 dark:border-slate-700">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Motivo de Consulta</p>
              </div>
              <div className="p-5">
                <fieldset disabled={!canEditClinical} className="contents"><MotivoConsulta id={id} /></fieldset>
              </div>
            </div>

            <DentalCard title="Examen de Tejidos" icon={Stethoscope} description="Revisión de tejidos blandos y duros">
              <fieldset disabled={!canEditClinical} className="contents"><ExamenTejidos id={id} /></fieldset>
            </DentalCard>

            <DentalCard title="Hábitos" icon={Activity} description="Hábitos orales y parafuncionales">
              <fieldset disabled={!canEditClinical} className="contents"><HabitosForm id={id} /></fieldset>
            </DentalCard>

            <DentalCard title="Enfermedades Personales" icon={Heart} description="Antecedentes médicos y enfermedades sistémicas">
              <fieldset disabled={!canEditClinical} className="contents"><EnfermedadesPersonales id={id} /></fieldset>
            </DentalCard>

            {/* Higiene, alergias, alimentación — inline */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50 dark:border-slate-700">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
                  <Droplets className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Higiene, Alergias y Alimentación</p>
              </div>
              <div className="p-5 space-y-5">
                <fieldset disabled={!canEditClinical} className="contents">
                  <HigieneBucal id={id} />
                  <div className="border-t border-gray-50 dark:border-slate-700 pt-5">
                    <Alergias id={id} />
                  </div>
                  <div className="border-t border-gray-50 dark:border-slate-700 pt-5">
                    <Alimentacion id={id} />
                  </div>
                </fieldset>
              </div>
            </div>

          </div>
        </div>

        {/* ── Archivos ── */}
        <Section title="Archivos del Paciente" icon={FileImage}>
          {/* Upload button */}
          <CldUploadWidget
            signatureEndpoint="/api/sign-cloudinary-params"
            options={{
              sources: ["local", "url", "google_drive", "camera"],
              // Permite que Cloudinary clasifique PDFs como raw cuando aplique, en vez de forzarlos como imagen.
              resourceType: "auto",
              folder: `pacientes/${id}/archivos`,
              tags: ["archivo"]
            }}
            onSuccess={async (r) => {
              if (!r.info || typeof r.info !== "object") return;

              const info = r.info as any;

              const response = await fetch(`/api/patients/${id}/files?kind=clinical_file`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  public_id: info.public_id,
                  resource_type: info.resource_type,
                  type: info.type ?? "upload",
                  // Nombre original elegido por el usuario; Cloudinary lo entrega sin extension.
                  name: info.original_filename,
                }),
              });

              if (!response.ok) {
                console.error("No se pudo restringir el archivo")
                return
              }

              const { asset } = await response.json() as { asset: PatientFile }
              setArchivos((p) => [...p, asset]);
            }}
          >
            {({ open }) => (
              <button
                onClick={() => open()}
                className="mb-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                           bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                           rounded-xl shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                Subir archivo
              </button>
            )}
          </CldUploadWidget>

          {archivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
              <FileImage className="w-8 h-8 text-gray-200 dark:text-slate-700 mb-2" />
              <p className="text-xs text-gray-400 dark:text-slate-500">Sin archivos subidos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {archivos.map((file, i) => (
                <ArchivoDialog
                  key={file.publicId}
                  file={file}
                  index={i}
                  getPrivateAssetUrl={getPrivateAssetUrl}
                  isPdfFile={isPdfFile}
                  onRename={handleRenameFile}
                  onDelete={() => {
                    deleteOneImage(file.publicId, file.type, file.resourceType)
                    setArchivos(p => p.filter(item => item.publicId !== file.publicId))
                  }}
                />
              ))}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}
