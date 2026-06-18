"use client"

import { type FormEvent, useEffect, useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type TypedDeleteConfirmationItem = {
  id: string | number
  name: string
  description?: string
}

type TypedDeleteConfirmationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: TypedDeleteConfirmationItem[]
  onConfirm: () => void | Promise<void>
  multipleConfirmationText?: string
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es-MX")
}

export default function TypedDeleteConfirmationDialog({
  open,
  onOpenChange,
  items,
  onConfirm,
  multipleConfirmationText = "eliminar todos",
}: TypedDeleteConfirmationDialogProps) {
  const [confirmationText, setConfirmationText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState("")

  const isMultiple = items.length > 1
  const expectedText = useMemo(() => {
    if (isMultiple) return multipleConfirmationText
    return items[0]?.name ?? ""
  }, [isMultiple, items, multipleConfirmationText])

  const canConfirm =
    expectedText.length > 0 && normalize(confirmationText) === normalize(expectedText)

  useEffect(() => {
    if (!open) {
      setConfirmationText("")
      setIsDeleting(false)
      setError("")
    }
  }, [open])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canConfirm || isDeleting) return

    try {
      setIsDeleting(true)
      setError("")
      await onConfirm()
      onOpenChange(false)
    } catch {
      setError("No se pudo eliminar. Intenta de nuevo.")
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmacion requerida
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              {isMultiple
                ? "Confirma la eliminacion permanente de los pacientes seleccionados."
                : "Confirma la eliminacion permanente del paciente seleccionado."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {isMultiple ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-slate-700">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-slate-700"
                  >
                    <p className="font-medium text-gray-800 dark:text-slate-100">
                      {item.description ?? item.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {items[0]?.description ?? items[0]?.name}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="typed-delete-confirmation"
                className="text-xs font-medium text-gray-600 dark:text-slate-300"
              >
                Escribe {isMultiple ? `"${multipleConfirmationText}"` : "solo el nombre"} para continuar
              </label>
              <Input
                id="typed-delete-confirmation"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder={expectedText}
                autoComplete="off"
                disabled={isDeleting}
              />
              {confirmationText && !canConfirm && (
                <p className="text-xs text-red-500">
                  El texto no coincide con la confirmacion requerida.
                </p>
              )}
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!canConfirm || isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar permanentemente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
