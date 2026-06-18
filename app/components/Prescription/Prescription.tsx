"use client"

import { PointerEvent, useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eraser,
  FilePenLine,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Stethoscope,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  PrescriptionSettingsDialog,
  type PrescriptionSettings,
} from "./PrescriptionSettingsDialog"

type TemplateForm = {
  logoUrl: string
  doctorFirstName: string
  doctorLastName: string
  doctorSecondLastName: string
  degreeInstitution: string
  professionalLicense: string
  specialty: string
  clinicAddress: string
  signatureDataUrl: string
}

type StoredTemplate = TemplateForm & {
  id: string
  isOwn: boolean
}

type PrescriptionForm = {
  issueDate: string
  patientFirstName: string
  patientLastName: string
  patientSecondLastName: string
  patientAge: string
  medicines: Medicine[]
}

type Medicine = {
  id: string
  genericName: string
  dosage: string
  frequency: string
  duration: string
}

type PatientSearchResult = {
  id: number
  name: string
  apellido_pat?: string | null
  apellido_mat?: string | null
  telefono?: string | null
  edad?: number | string | null
}

const emptyTemplate: TemplateForm = {
  logoUrl: "",
  doctorFirstName: "",
  doctorLastName: "",
  doctorSecondLastName: "",
  degreeInstitution: "",
  professionalLicense: "",
  specialty: "",
  clinicAddress: "",
  signatureDataUrl: "",
}

const emptyPrescription: PrescriptionForm = {
  issueDate: new Date().toISOString().slice(0, 10),
  patientFirstName: "",
  patientLastName: "",
  patientSecondLastName: "",
  patientAge: "",
  medicines: [
    {
      id: "medicine-1",
      genericName: "",
      dosage: "",
      frequency: "",
      duration: "",
    },
  ],
}

const emptyPrescriptionSettings: PrescriptionSettings = {
  logoUrl: "",
  clinicName: "",
  clinicAddress: "",
  clinicPhone: "",
  orientation: "horizontal",
}

const inputClass =
  "h-10 rounded-xl border-gray-200 bg-white focus-visible:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
const medicineInputClass =
  "h-8 rounded-lg border-gray-200 bg-white text-xs focus-visible:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function fullName(...parts: string[]) {
  return parts.filter(Boolean).join(" ")
}

export default function Prescription() {
  const [template, setTemplate] = useState<TemplateForm>(emptyTemplate)
  const [templates, setTemplates] = useState<StoredTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [prescriptionSettings, setPrescriptionSettings] =
    useState<PrescriptionSettings>(emptyPrescriptionSettings)
  const [prescription, setPrescription] = useState<PrescriptionForm>(emptyPrescription)
  const [patientSearch, setPatientSearch] = useState("")
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([])
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [showPatientResults, setShowPatientResults] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const { toast } = useToast()

  const drawSavedSignature = useCallback((dataUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (!dataUrl) return

    const image = new Image()
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    image.src = dataUrl
  }, [])

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const [templateResponse, settingsResponse] = await Promise.all([
          fetch("/api/prescription-template"),
          fetch("/api/prescription-settings"),
        ])
        const [templateBody, settingsBody] = await Promise.all([
          templateResponse.json(),
          settingsResponse.json(),
        ])
        if (!templateResponse.ok) {
          throw new Error(templateBody.error || "No se pudo cargar la plantilla")
        }
        if (!settingsResponse.ok) {
          throw new Error(settingsBody.error || "No se pudo cargar la configuracion global")
        }

        const loadedTemplates: StoredTemplate[] =
          templateBody.templates ?? (templateBody.template ? [templateBody.template] : [])
        const ownTemplate = loadedTemplates.find((item) => item.isOwn)
        const loadedSettings: PrescriptionSettings =
          settingsBody.settings ?? emptyPrescriptionSettings

        setTemplates(loadedTemplates)
        setPrescriptionSettings({
          logoUrl: loadedSettings.logoUrl || ownTemplate?.logoUrl || "",
          clinicName: loadedSettings.clinicName || "",
          clinicAddress: loadedSettings.clinicAddress || ownTemplate?.clinicAddress || "",
          clinicPhone: loadedSettings.clinicPhone || "",
          orientation: loadedSettings.orientation ?? "horizontal",
        })
        if (ownTemplate) {
          setTemplate(ownTemplate)
          setSelectedTemplateId(ownTemplate.id)
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error al cargar",
          description: error instanceof Error ? error.message : "Intenta nuevamente.",
        })
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [drawSavedSignature, toast])

  useEffect(() => {
    if (!loading) {
      drawSavedSignature(template.signatureDataUrl)
    }
  }, [drawSavedSignature, loading, template.signatureDataUrl])

  useEffect(() => {
    const query = patientSearch.trim()
    if (query.length < 2) {
      setPatientResults([])
      setSearchingPatients(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearchingPatients(true)
      try {
        const response = await fetch(`/patients/api?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || "No se pudo buscar pacientes")
        setPatientResults(Array.isArray(body) ? body : [])
      } catch (error) {
        if (!controller.signal.aborted) {
          setPatientResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingPatients(false)
        }
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [patientSearch])

  const selectedTemplate = templates.find((item) => item.id === selectedTemplateId)
  const ownTemplate = templates.find((item) => item.isOwn)
  const hasTemplate = Boolean(ownTemplate)
  const canEditTemplate = !selectedTemplateId || Boolean(selectedTemplate?.isOwn)

  const selectTemplate = (selected: StoredTemplate) => {
    setTemplate(selected)
    setSelectedTemplateId(selected.id)
  }

  const selectOwnTemplate = () => {
    if (ownTemplate) {
      selectTemplate(ownTemplate)
      return
    }

    setTemplate(emptyTemplate)
    setSelectedTemplateId(null)
  }

  const clearDentistData = () => {
    if (!canEditTemplate) return
    setTemplate({ ...emptyTemplate })
  }

  const clearPrescriptionData = () => {
    setSelectedPatientId(null)
    setPatientSearch("")
    setPatientResults([])
    setPrescription({
      issueDate: "",
      patientFirstName: "",
      patientLastName: "",
      patientSecondLastName: "",
      patientAge: "",
      medicines: [
        {
          id: crypto.randomUUID(),
          genericName: "",
          dosage: "",
          frequency: "",
          duration: "",
        },
      ],
    })
  }

  const selectPatient = (patient: PatientSearchResult) => {
    setSelectedPatientId(patient.id)
    setPatientSearch(fullName(patient.name, patient.apellido_pat ?? "", patient.apellido_mat ?? ""))
    setPatientResults([])
    setShowPatientResults(false)
    setPrescription((current) => ({
      ...current,
      patientFirstName: patient.name ?? "",
      patientLastName: patient.apellido_pat ?? "",
      patientSecondLastName: patient.apellido_mat ?? "",
      patientAge: patient.edad == null ? "" : String(patient.edad),
    }))
  }

  const clearSelectedPatient = () => {
    setSelectedPatientId(null)
    setPatientSearch("")
    setPatientResults([])
  }

  const setTemplateField = (field: keyof TemplateForm, value: string) => {
    setTemplate((current) => ({ ...current, [field]: value }))
  }

  const setPrescriptionField = (
    field: Exclude<keyof PrescriptionForm, "medicines">,
    value: string
  ) => {
    if (field.startsWith("patient")) {
      setSelectedPatientId(null)
    }
    setPrescription((current) => ({ ...current, [field]: value }))
  }

  const setMedicineField = (
    medicineId: string,
    field: Exclude<keyof Medicine, "id">,
    value: string
  ) => {
    setPrescription((current) => ({
      ...current,
      medicines: current.medicines.map((medicine) =>
        medicine.id === medicineId ? { ...medicine, [field]: value } : medicine
      ),
    }))
  }

  const addMedicine = () => {
    setPrescription((current) => ({
      ...current,
      medicines: [
        ...current.medicines,
        {
          id: crypto.randomUUID(),
          genericName: "",
          dosage: "",
          frequency: "",
          duration: "",
        },
      ],
    }))
  }

  const removeMedicine = (medicineId: string) => {
    setPrescription((current) => ({
      ...current,
      medicines:
        current.medicines.length === 1
          ? current.medicines
          : current.medicines.filter((medicine) => medicine.id !== medicineId),
    }))
  }

  const canvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    const context = canvas.getContext("2d")
    if (!context) return
    const point = canvasPoint(event)
    drawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext("2d")
    if (!context) return
    const point = canvasPoint(event)
    context.lineWidth = 2.4
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#0f172a"
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const stopDrawing = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const dataUrl = canvasRef.current?.toDataURL("image/png") ?? ""
    setTemplateField("signatureDataUrl", dataUrl)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height)
    setTemplateField("signatureDataUrl", "")
  }

  const saveTemplate = async () => {
    if (!canEditTemplate) return

    const required: Array<keyof TemplateForm> = [
      "doctorFirstName",
      "doctorLastName",
      "degreeInstitution",
      "professionalLicense",
    ]
    if (required.some((field) => !template[field].trim())) {
      toast({
        variant: "destructive",
        title: "Faltan datos obligatorios",
        description: "Completa los campos marcados con asterisco.",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/prescription-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...template,
          clinicAddress: template.clinicAddress || prescriptionSettings.clinicAddress,
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || "No se pudo guardar la plantilla")

      const savedTemplate: StoredTemplate = body.template
      setTemplate(savedTemplate)
      setSelectedTemplateId(savedTemplate.id)
      setTemplates((current) => {
        const otherTemplates = current.filter((item) => !item.isOwn)
        return [...otherTemplates, savedTemplate].sort((first, second) =>
          fullName(first.doctorLastName, first.doctorFirstName).localeCompare(
            fullName(second.doctorLastName, second.doctorFirstName),
            "es"
          )
        )
      })
      toast({
        title: hasTemplate ? "Plantilla actualizada" : "Plantilla creada",
        description: "Los datos del dentista quedaron guardados.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      })
    } finally {
      setSaving(false)
    }
  }

  const savePrescriptionSettings = async (settings: PrescriptionSettings) => {
    setSavingSettings(true)
    try {
      const response = await fetch("/api/prescription-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || "No se pudo guardar la configuracion")

      setPrescriptionSettings(body.settings ?? settings)
      toast({
        title: "Configuracion actualizada",
        description: "Los datos globales se aplicaran a todas las recetas.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Intenta nuevamente.",
      })
      throw error
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
      </div>
    )
  }

  const doctorName = fullName(
    template.doctorFirstName,
    template.doctorLastName,
    template.doctorSecondLastName
  )
  const patientName = fullName(
    prescription.patientFirstName,
    prescription.patientLastName,
    prescription.patientSecondLastName
  )
  const formattedDate = prescription.issueDate
    ? new Date(`${prescription.issueDate}T12:00:00`).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : ""
  const prescriptionLogoUrl = prescriptionSettings.logoUrl || template.logoUrl
  const prescriptionClinicName = prescriptionSettings.clinicName || "Clinica dental"
  const prescriptionClinicAddress =
    prescriptionSettings.clinicAddress || template.clinicAddress
  const prescriptionClinicPhone = prescriptionSettings.clinicPhone || "Telefono de la clinica"
  const isLandscape = prescriptionSettings.orientation !== "vertical"
  const previewFrameClass = isLandscape
    ? "mx-auto w-full max-w-[920px]"
    : "mx-auto w-full max-w-[620px]"
  const previewBodyClass = isLandscape ? "min-h-[480px]" : "min-h-[610px]"
  const contentGridClass = isLandscape
    ? "grid items-start gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(620px,1.15fr)]"
    : "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]"

  return (
    <div className="prescription-module space-y-5">
      <div className="no-print flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm">
            <FilePenLine className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Plantilla de receta médica</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {!canEditTemplate
                ? "Plantilla seleccionada para preparar e imprimir la receta."
                : hasTemplate
                ? "Edita tu única plantilla y prepara los datos de la receta."
                : "Crea la plantilla que usarás en tus recetas."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrescriptionSettingsDialog
            value={prescriptionSettings}
            saving={savingSettings}
            onSave={savePrescriptionSettings}
          />
          <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          {!canEditTemplate && (
            <Button variant="outline" onClick={selectOwnTemplate} className="rounded-xl">
              <UserRound className="mr-2 h-4 w-4" />
              {hasTemplate ? "Mi plantilla" : "Crear mi plantilla"}
            </Button>
          )}
        </div>
      </div>

      <section className="no-print rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Plantillas disponibles
          </h2>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
            Selecciona al dentista cuyos datos aparecerán en la receta.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={selectOwnTemplate}
            className="flex min-h-[172px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-4 text-center transition hover:border-sky-500 hover:bg-sky-50 dark:border-sky-800 dark:bg-sky-950/20 dark:hover:border-sky-600"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300">
              <Plus className="h-6 w-6" />
            </span>
            <span className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">
              Crear plantilla nueva
            </span>
            <span className="mt-1 max-w-52 text-[11px] text-slate-500 dark:text-slate-400">
              {hasTemplate
                ? "Abre tu plantilla personal para editarla."
                : "Completa tus datos para crear tu plantilla personal."}
            </span>
          </button>

            {templates.map((storedTemplate) => {
              const isSelected = storedTemplate.id === selectedTemplateId
              const storedDoctorName = fullName(
                storedTemplate.doctorFirstName,
                storedTemplate.doctorLastName,
                storedTemplate.doctorSecondLastName
              )

              return (
                <button
                  key={storedTemplate.id}
                  type="button"
                  onClick={() => selectTemplate(storedTemplate)}
                  aria-pressed={isSelected}
                  className={`relative rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-sky-500 bg-sky-50 shadow-sm ring-2 ring-sky-100 dark:bg-sky-950/30 dark:ring-sky-900"
                      : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-sky-700"
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-sky-600" />
                  )}
                  <div className="flex items-start gap-3 pr-6">
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-600">
                      {prescriptionSettings.logoUrl || storedTemplate.logoUrl ? (
                        <img
                          src={prescriptionSettings.logoUrl || storedTemplate.logoUrl}
                          alt=""
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <Stethoscope className="h-5 w-5 text-sky-500" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                        {storedDoctorName}
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-sky-600 dark:text-sky-400">
                        {storedTemplate.specialty || "Odontología general"}
                      </span>
                      {storedTemplate.isOwn && (
                        <span className="mt-1 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                          Tu plantilla
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <p className="truncate">
                      <strong className="text-slate-700 dark:text-slate-200">Cédula:</strong>{" "}
                      {storedTemplate.professionalLicense}
                    </p>
                    <p className="truncate">{storedTemplate.degreeInstitution}</p>
                    <p className="truncate">
                      {prescriptionSettings.clinicAddress || storedTemplate.clinicAddress}
                    </p>
                  </div>
                </button>
              )
            })}
        </div>
      </section>

      <div className={contentGridClass}>
        <div className="no-print space-y-5">
          <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <SectionTitle
              icon={Stethoscope}
              title="Datos del dentista"
              description={
                canEditTemplate
                  ? "Estos datos se conservarán en tu plantilla personal."
                  : "Datos protegidos de la plantilla seleccionada."
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearDentistData}
                  disabled={!canEditTemplate}
                  className="shrink-0 rounded-xl"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Limpiar
                </Button>
              }
            />

            {!canEditTemplate && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 shadow-sm dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>
                  Puedes usar esta plantilla para la receta, pero solo su propietario puede modificarla.
                </span>
              </div>
            )}

            <fieldset disabled={!canEditTemplate} className="space-y-5 disabled:opacity-75">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="doctorFirstName" label="Nombre" required>
                <Input
                  id="doctorFirstName"
                  value={template.doctorFirstName}
                  onChange={(event) => setTemplateField("doctorFirstName", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="doctorLastName" label="Apellido paterno" required>
                <Input
                  id="doctorLastName"
                  value={template.doctorLastName}
                  onChange={(event) => setTemplateField("doctorLastName", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="doctorSecondLastName" label="Apellido materno">
                <Input
                  id="doctorSecondLastName"
                  value={template.doctorSecondLastName}
                  onChange={(event) => setTemplateField("doctorSecondLastName", event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="degreeInstitution" label="Institución que expidió el título" required>
                <Input
                  id="degreeInstitution"
                  value={template.degreeInstitution}
                  onChange={(event) => setTemplateField("degreeInstitution", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="professionalLicense" label="Cédula profesional" required>
                <Input
                  id="professionalLicense"
                  value={template.professionalLicense}
                  onChange={(event) => setTemplateField("professionalLicense", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="specialty" label="Especialidad (opcional)">
                <Input
                  id="specialty"
                  value={template.specialty}
                  onChange={(event) => setTemplateField("specialty", event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid gap-4">
              <div className="max-w-md space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Firma electrónica</Label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-500"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                    Limpiar
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={220}
                  onPointerDown={canEditTemplate ? startDrawing : undefined}
                  onPointerMove={canEditTemplate ? draw : undefined}
                  onPointerUp={canEditTemplate ? stopDrawing : undefined}
                  onPointerCancel={canEditTemplate ? stopDrawing : undefined}
                  onPointerLeave={canEditTemplate ? stopDrawing : undefined}
                  className={`h-[150px] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-600 ${
                    canEditTemplate ? "touch-none" : "cursor-not-allowed"
                  }`}
                  aria-label="Área para dibujar la firma"
                />
                <p className="text-[10px] text-slate-400">Dibuja con el mouse, lápiz digital o dedo.</p>
              </div>
            </div>
            </fieldset>

            {canEditTemplate && (
              <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-700">
                <Button
                  type="button"
                  onClick={saveTemplate}
                  disabled={saving}
                  className="rounded-xl bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600 dark:text-white"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {hasTemplate ? "Guardar cambios" : "Crear plantilla"}
                </Button>
              </div>
            )}
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <SectionTitle
              icon={UserRound}
              title="Datos de la receta"
              description="Cambian para cada paciente y no modifican tu plantilla."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearPrescriptionData}
                  className="shrink-0 rounded-xl"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Limpiar
                </Button>
              }
            />

            <div className="relative max-w-2xl space-y-1.5">
              <Label htmlFor="patientSearch" className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Buscar paciente registrado
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="patientSearch"
                  value={patientSearch}
                  onChange={(event) => {
                    setPatientSearch(event.target.value)
                    setSelectedPatientId(null)
                    setShowPatientResults(true)
                  }}
                  onFocus={() => setShowPatientResults(true)}
                  onBlur={() => window.setTimeout(() => setShowPatientResults(false), 120)}
                  placeholder="Busca por nombre, apellidos o telefono"
                  className={`${inputClass} pl-9 pr-10`}
                  autoComplete="off"
                />
                {patientSearch && (
                  <button
                    type="button"
                    onClick={clearSelectedPatient}
                    className="absolute right-3 top-3 text-slate-400 hover:text-rose-500"
                    aria-label="Limpiar busqueda de paciente"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {selectedPatientId && (
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-300">
                  <UserCheck className="h-3.5 w-3.5" />
                  Paciente seleccionado
                </p>
              )}
              {showPatientResults && (patientSearch.trim().length >= 2 || searchingPatients) && (
                <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {searchingPatients ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
                      Buscando pacientes...
                    </div>
                  ) : patientResults.length ? (
                    patientResults.map((patient) => {
                      const name = fullName(patient.name, patient.apellido_pat ?? "", patient.apellido_mat ?? "")
                      return (
                        <button
                          key={patient.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPatient(patient)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-sky-50 dark:hover:bg-slate-700"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-700 dark:text-slate-100">
                              {name || "Paciente sin nombre"}
                            </span>
                            <span className="block truncate text-xs text-slate-400">
                              {patient.telefono || "Sin telefono"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-slate-400">
                            {patient.edad ? `${patient.edad} anos` : "Edad -"}
                          </span>
                        </button>
                      )
                    })
                  ) : (
                    <p className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Sin pacientes encontrados.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field id="patientFirstName" label="Nombre">
                <Input
                  id="patientFirstName"
                  value={prescription.patientFirstName}
                  onChange={(event) => setPrescriptionField("patientFirstName", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="patientLastName" label="Apellido paterno">
                <Input
                  id="patientLastName"
                  value={prescription.patientLastName}
                  onChange={(event) => setPrescriptionField("patientLastName", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="patientSecondLastName" label="Apellido materno">
                <Input
                  id="patientSecondLastName"
                  value={prescription.patientSecondLastName}
                  onChange={(event) => setPrescriptionField("patientSecondLastName", event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="patientAge" label="Edad">
                <Input
                  id="patientAge"
                  type="number"
                  min="0"
                  max="130"
                  inputMode="numeric"
                  value={prescription.patientAge}
                  onChange={(event) => setPrescriptionField("patientAge", event.target.value)}
                  placeholder="Ej. 35"
                  className={inputClass}
                />
              </Field>
            </div>

            <Field id="issueDate" label="Fecha de expedición">
              <Input
                id="issueDate"
                type="date"
                value={prescription.issueDate}
                onChange={(event) => setPrescriptionField("issueDate", event.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">Medicamentos</h3>
                  <p className="text-[10px] text-slate-400">Cada medicamento conserva sus propias indicaciones.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addMedicine} className="rounded-xl">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Agregar medicamento
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600">
                <div className="min-w-[820px]">
                  <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_36px] gap-2 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-700/70 dark:text-slate-300">
                    <span>Medicamento</span>
                    <span>Dosis</span>
                    <span>Frecuencia</span>
                    <span>Duración</span>
                    <span className="sr-only">Acciones</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {prescription.medicines.map((medicine, index) => (
                      <div
                        key={medicine.id}
                        className="grid grid-cols-[1.5fr_1fr_1fr_1fr_36px] items-center gap-2 bg-white px-3 py-1.5 dark:bg-slate-800"
                      >
                        <Input
                          aria-label={`Medicamento ${index + 1}`}
                          value={medicine.genericName}
                          onChange={(event) => setMedicineField(medicine.id, "genericName", event.target.value)}
                          placeholder="Amoxicilina 500 mg"
                          className={medicineInputClass}
                        />
                        <Input
                          aria-label={`Dosis del medicamento ${index + 1}`}
                          value={medicine.dosage}
                          onChange={(event) => setMedicineField(medicine.id, "dosage", event.target.value)}
                          placeholder="1 cápsula"
                          className={medicineInputClass}
                        />
                        <Input
                          aria-label={`Frecuencia del medicamento ${index + 1}`}
                          value={medicine.frequency}
                          onChange={(event) => setMedicineField(medicine.id, "frequency", event.target.value)}
                          placeholder="Cada 8 horas"
                          className={medicineInputClass}
                        />
                        <Input
                          aria-label={`Duración del medicamento ${index + 1}`}
                          value={medicine.duration}
                          onChange={(event) => setMedicineField(medicine.id, "duration", event.target.value)}
                          placeholder="7 días"
                          className={medicineInputClass}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMedicine(medicine.id)}
                          disabled={prescription.medicines.length === 1}
                          aria-label={`Eliminar medicamento ${index + 1}`}
                          className="h-8 w-8 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="prescription-preview-column sticky top-20 space-y-4">
          <aside
            className={`prescription-preview overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg ${previewFrameClass}`}
          >
          <div className="border-b-4 border-sky-500 bg-slate-50 px-7 py-5">
            <div className="grid grid-cols-[96px_minmax(0,1fr)_96px] items-start gap-5">
              <div className="grid h-20 w-24 place-items-center overflow-hidden">
                {prescriptionLogoUrl ? (
                  <img src={prescriptionLogoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-600">Receta médica</p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {doctorName || "Nombre del médico"}
                </h2>
                {template.specialty && <p className="mt-0.5 text-sm font-semibold text-sky-600">{template.specialty}</p>}
                <p className="mt-2 text-xs text-slate-500">
                  Cédula profesional: {template.professionalLicense || "—"}
                </p>
                <p className="text-xs text-slate-500">{template.degreeInstitution || "Institución educativa"}</p>
              </div>
              <div aria-hidden="true" />
            </div>
          </div>

          <div className={`${previewBodyClass} px-7 py-6 text-slate-700`}>
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span>
                  <strong className="text-slate-900">Paciente:</strong> {patientName || "Nombre completo del paciente"}
                </span>
                <span>
                  <strong className="text-slate-900">Edad:</strong>{" "}
                  {prescription.patientAge ? `${prescription.patientAge} años` : "—"}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
                {formattedDate || "Fecha de expedición"}
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_0.8fr] bg-sky-50 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                <span className="px-2 py-1.5">Medicamento</span>
                <span className="border-l border-sky-100 px-2 py-1.5">Dosis</span>
                <span className="border-l border-sky-100 px-2 py-1.5">Frecuencia</span>
                <span className="border-l border-sky-100 px-2 py-1.5">Duración</span>
              </div>
              <div className="divide-y divide-slate-200">
                {prescription.medicines.map((medicine, index) => (
                  <div
                    key={medicine.id}
                    className="grid min-h-9 grid-cols-[1.5fr_1fr_1fr_0.8fr] text-xs leading-5 text-slate-700"
                  >
                    <span className="whitespace-pre-wrap px-2 py-1.5">
                      {medicine.genericName || `Medicamento ${index + 1}`}
                    </span>
                    <span className="whitespace-pre-wrap border-l border-slate-200 px-2 py-1.5">
                      {medicine.dosage || "—"}
                    </span>
                    <span className="whitespace-pre-wrap border-l border-slate-200 px-2 py-1.5">
                      {medicine.frequency || "—"}
                    </span>
                    <span className="whitespace-pre-wrap border-l border-slate-200 px-2 py-1.5">
                      {medicine.duration || "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-20 flex justify-end">
              <div className="w-56 text-center">
                <div className="flex h-20 items-end justify-center">
                  {template.signatureDataUrl && (
                    <img src={template.signatureDataUrl} alt="Firma del médico" className="max-h-20 max-w-full object-contain" />
                  )}
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="text-xs font-bold text-slate-900">{doctorName || "Firma del médico"}</p>
                  <p className="text-[10px] text-slate-500">Cédula: {template.professionalLicense || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1.5fr_1fr] items-center gap-4 border-t border-slate-200 bg-slate-50 px-7 py-4 text-xs text-slate-500">
            <p className="truncate text-left font-semibold text-slate-600">
              {prescriptionClinicName}
            </p>
            <p className="inline-flex items-center justify-center gap-1.5 text-center font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              {prescriptionClinicAddress || "Domicilio del establecimiento de la clínica dental"}
            </p>
            <p className="inline-flex items-center justify-end gap-1.5 truncate text-right font-medium">
              <Phone className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              {prescriptionClinicPhone}
            </p>
          </div>
          </aside>
          <div className="no-print flex justify-center">
            <Button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-sky-600 px-6 text-white hover:bg-sky-700 dark:bg-sky-600 dark:text-white"
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          body > header,
          .no-print {
            display: none !important;
          }
          .prescription-module {
            margin: 0 !important;
          }
          .prescription-module > div.grid {
            display: block !important;
          }
          .prescription-preview {
            position: static !important;
            width: 100% !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .prescription-preview-column {
            position: static !important;
          }
          @page {
            size: letter ${isLandscape ? "landscape" : "portrait"};
            margin: 12mm;
          }
        }
      `}</style>
    </div>
  )
}
