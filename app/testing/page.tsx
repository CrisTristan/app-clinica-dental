"use client"
 
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
 
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
 
const duros = [
  {
    id: "esmalte",
    label: "Esmalte",
  },
  {
    id: "raiz",
    label: "Raiz",
  },
  {
    id: "dentina",
    label: "Dentina",
  },
  {
    id: "huesos",
    label: "Huesos",
  }
] as const

const blandos = [
  {
    id: "encia",
    label: "Encia"
  },
  {
    id: "insercion",
    label: "Insercion"
  },
  {
    id: "epitelial",
    label: "Epitelial (Migración)"
  },
  {
    id: "pulpa",
    label: "Pulpa (Alteraciones)"
  },
  {
    id: "velo",
    label: "Velo de Paladar"
  },
  {
    id: "carrillos",
    label: "Carrillos"
  }
]

const oclusion =[
  {
    id: "sobre mordida",
    label: "Sobre Mordida Vertical"
  },
  {
    id: "desgaste",
    label: "Desgaste"
  },
  {
    id: "onoclusión",
    label: "Onoclusión"
  },
  {
    id: "intercurpideo",
    label: "Intercuspideo"
  },
  {
    id: "mareos",
    label: "Mareos"
  },
  {
    id: "desmayos",
    label: "Desmayos"
  },
  {
    id: "vertigos",
    label: "Vertigos"
  }
]
 
const FormSchema = z.object({
  duros: z.array(z.string()),
  blandos: z.array(z.string()),
  oclusion: z.array(z.string())
})
 
export default function CheckboxReactHookFormMultiple() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      duros: [],
      blandos: [],
      oclusion: []
    },
  })
 
  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    })
  }
 
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="duros"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Examen de Tejidos</FormLabel>
                <FormDescription>
                  Duros
                </FormDescription>
              </div>
              {duros.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="duros"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        {/* campor para tejidos blandos */}
        <FormField
          control={form.control}
          name="blandos"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormDescription>
                  Blandos
                </FormDescription>
              </div>
              {blandos.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="blandos"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        {/* campos para oclusión */}
        <FormField
          control={form.control}
          name="oclusion"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormDescription>
                  Oclusión
                </FormDescription>
              </div>
              {oclusion.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="oclusion"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Guardar Datos</Button>
      </form>
    </Form>
  )
}