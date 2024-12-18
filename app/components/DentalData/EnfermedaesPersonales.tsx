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
import { useEffect } from "react"

const items = [
  {
    id: "aparato cardiovascular",
    label: "Aparato Cardiovascular",
  },
  {
    id: "sisteme nervioso",
    label: "Sistema Nervioso",
  },
  {
    id: "renal",
    label: "Renal",
  },
  {
    id: "aparato digestivo",
    label: "Aparato Digestivo",
  },
  {
    id: "aparato respiratorio",
    label: "Aparato Respiratorio",
  },
  {
    id: "diabetes",
    label: "Diabetes",
  },
  {
    id: "propencion hemorragica",
    label: "Propencion Hemorragica",
  },
  {
    id: "artritis",
    label: "Artritis",
  },
  {
    id: "pruebas de laboratorio",
    label: "Pruebas de Laboratorio",
  },
  {
    id: "estado general",
    label: "Estado General",
  },
  {
    id: "estudio radiologico",
    label: "Estudio Radiologico",
  },
] as const

const FormSchema = z.object({
  items: z.array(z.string()),
})

export default function EnfermedadesPersonales({id}: {id: string | null}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
    },
  })

  useEffect(()=>{
    const fetchData = async ()=>{
      if (id) {
        try {
            const response = await fetch(`/DentalData/api?id=${id}`);
            if (!response.ok) {
                throw new Error('Error en la solicitud');
            }
            const data = await response.json();
            //console.log(data);
            // console.log(data.blandos)
            form.reset(data.enfermedadesPersonales)
        } catch (error) {
            console.log(error);
        }
    }
    }
    
    fetchData();
  },[]);
  
  function onSubmit(data: z.infer<typeof FormSchema>) {
    
    fetch('/DentalData/api', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Datos que enviarás en el cuerpo de la solicitud
        enfermedadesPersonales: data,
        id: id
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error en la solicitud');
      }

      toast({
        title: "Se han guardado los datos",
        description: (
          <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
            <code className="text-white">{JSON.stringify(data, null, 2)}</code>
          </pre>
        ),
      })

      return response.json();
    }).catch(error => {
      console.log(error);
    })

  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="items"
          render={() => (
            <FormItem>
              <div className="mb-4">
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="items"
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
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}