"use client"

import { ChangeEvent, useEffect, useState } from "react"
import {
  Building2,
  ImagePlus,
  Loader2,
  MapPin,
  PanelLeft,
  PanelTop,
  Phone,
  Save,
  Settings2,
  Upload,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type PrescriptionSettings = {
  logoUrl: string
  clinicName: string
  clinicAddress: string
  clinicPhone: string
  orientation: "horizontal" | "vertical"
}

type PrescriptionSettingsDialogProps = {
  value: PrescriptionSettings
  saving?: boolean
  onSave: (settings: PrescriptionSettings) => Promise<void> | void
}

const emptySettings: PrescriptionSettings = {
  logoUrl: "",
  clinicName: "",
  clinicAddress: "",
  clinicPhone: "",
  orientation: "horizontal",
}

export function PrescriptionSettingsDialog({
  value,
  saving = false,
  onSave,
}: PrescriptionSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<PrescriptionSettings>(value ?? emptySettings)
  const [logoError, setLogoError] = useState("")

  useEffect(() => {
    if (open) {
      setDraft({ ...emptySettings, ...value })
      setLogoError("")
    }
  }, [open, value])

  const setDraftField = <Field extends keyof PrescriptionSettings>(
    field: Field,
    fieldValue: PrescriptionSettings[Field]
  ) => {
    setDraft((current) => ({ ...current, [field]: fieldValue }))
  }

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setLogoError("Selecciona una imagen valida.")
      return
    }
    if (file.size > 1_500_000) {
      setLogoError("El logo debe pesar menos de 1.5 MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setLogoError("")
      setDraftField("logoUrl", String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  const save = async () => {
    await onSave({
      logoUrl: draft.logoUrl.trim(),
      clinicName: draft.clinicName.trim(),
      clinicAddress: draft.clinicAddress.trim(),
      clinicPhone: draft.clinicPhone.trim(),
      orientation: draft.orientation,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Settings2 className="mr-2 h-4 w-4" />
          Configuracion
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl border-slate-200 p-0 dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
              <Settings2 className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                Configuracion global de recetas
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Estos datos se aplican al encabezado, pie y formato de todas las recetas medicas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-5 px-6 py-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Logo de la clinica
            </Label>
            <label className="flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-800">
              {draft.logoUrl ? (
                <img
                  src={draft.logoUrl}
                  alt="Logo de la clinica"
                  className="h-full w-full object-contain p-4"
                />
              ) : (
                <>
                  <ImagePlus className="mb-2 h-7 w-7 text-sky-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Seleccionar logo
                  </span>
                  <span className="mt-1 px-4 text-[10px] text-slate-400">
                    PNG, JPG o WEBP, maximo 1.5 MB
                  </span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleLogo} className="sr-only" />
            </label>
            {logoError && <p className="text-[11px] font-semibold text-rose-500">{logoError}</p>}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-sky-600">
                <Upload className="h-3.5 w-3.5" />
                Cambiar logo
                <input type="file" accept="image/*" onChange={handleLogo} className="sr-only" />
              </label>
              {draft.logoUrl && (
                <button
                  type="button"
                  onClick={() => setDraftField("logoUrl", "")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-500"
                >
                  <X className="h-3.5 w-3.5" />
                  Quitar
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sky-600 dark:bg-slate-900 dark:text-sky-300">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Datos compartidos
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    La receta impresa usara estos datos sin depender de la plantilla del dentista seleccionado.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="prescriptionClinicName"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Nombre de la clinica
              </Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="prescriptionClinicName"
                  value={draft.clinicName}
                  onChange={(event) => setDraftField("clinicName", event.target.value)}
                  placeholder="Nombre comercial de la clinica"
                  className="h-10 rounded-xl border-gray-200 bg-white pl-9 focus-visible:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="prescriptionClinicPhone"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Telefono de la clinica
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="prescriptionClinicPhone"
                  value={draft.clinicPhone}
                  onChange={(event) => setDraftField("clinicPhone", event.target.value)}
                  placeholder="Ej. 998 123 4567"
                  className="h-10 rounded-xl border-gray-200 bg-white pl-9 focus-visible:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Orientacion de impresion
              </Label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setDraftField("orientation", "horizontal")}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${
                    draft.orientation === "horizontal"
                      ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <PanelTop className="h-4 w-4" />
                  Horizontal
                </button>
                <button
                  type="button"
                  onClick={() => setDraftField("orientation", "vertical")}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold transition ${
                    draft.orientation === "vertical"
                      ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <PanelLeft className="h-4 w-4" />
                  Vertical
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="prescriptionClinicAddress"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Domicilio de la clinica <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Textarea
                  id="prescriptionClinicAddress"
                  value={draft.clinicAddress}
                  onChange={(event) => setDraftField("clinicAddress", event.target.value)}
                  placeholder="Calle, numero, colonia, ciudad, estado y codigo postal"
                  className="min-h-32 rounded-xl border-gray-200 bg-white pl-9 focus-visible:ring-sky-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 px-6 py-4 dark:border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={saving || !draft.clinicAddress.trim()}
            className="rounded-xl bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600 dark:text-white"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar configuracion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
