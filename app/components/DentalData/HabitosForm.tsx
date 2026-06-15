"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "@/hooks/use-toast"
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { useEffect } from "react"
import { Check } from "lucide-react"

const generalItems = [
  { id: "bricomania",         label: "Bricomania"              },
  { id: "contracciones",      label: "Contracciones Musculares" },
  { id: "Habitos de mordida", label: "Hábitos de Mordida"      },
  { id: "respiracion bucal",  label: "Respiración Bucal"       },
] as const

const chupadorItems = [
  { id: "labios",  label: "Labios"  },
  { id: "lengua",  label: "Lengua"  },
  { id: "dedos",   label: "Dedos"   },
] as const

const FormSchema = z.object({ items: z.array(z.string()) })

function ChipGroup({
  items, field,
}: {
  items: readonly { id: string; label: string }[]
  field: { value: string[]; onChange: (v: string[]) => void }
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const active = field.value?.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              field.onChange(
                active
                  ? field.value.filter(v => v !== item.id)
                  : [...field.value, item.id]
              )
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all select-none
              ${active
                ? "bg-sky-500 dark:bg-sky-600 text-white border-sky-500 shadow-sm"
                : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400"
              }`}
          >
            {active && <Check className="w-3 h-3" />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export default function HabitosForm({ id }: { id: string | null }) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: { items: [] },
  })

  useEffect(() => {
    if (!id) return
    fetch(`/DentalData/api?id=${id}`)
      .then(r => r.json())
      .then(data => { if (data?.habitos) form.reset(data.habitos) })
      .catch(console.error)
  }, [])

  function onSubmit(data: z.infer<typeof FormSchema>) {
    fetch("/DentalData/api", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habitos: data, id }),
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(() => toast({ title: "Hábitos guardados" }))
      .catch(() => toast({ title: "Error al guardar", variant: "destructive" }))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="items"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <ChipGroup items={generalItems} field={field} />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                  Chupadores de
                </p>
                <ChipGroup items={chupadorItems} field={field} />
              </div>

              <FormMessage />
            </FormItem>
          )}
        />

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white
                     bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600
                     rounded-xl shadow-sm transition-all"
        >
          Guardar
        </button>
      </form>
    </Form>
  )
}
