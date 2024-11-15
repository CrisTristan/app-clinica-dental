"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { loginAction } from "../actions/auth-actions"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { loginSchema } from "@/lib/zod"

export default function FormLogin({
  isVerified
}: 
{
  isVerified: boolean
}) {

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // 1. Define your form.
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    },
  })

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof loginSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    setError(null)
    startTransition(async ()=>{
      const response = await loginAction(values)
      console.log(response);
      if(response.error){
        setError(response.error);
      }else{
        router.push("/pacientes");
      } 
    })
    
  }

  return (
    <div className="max-w-52">
    <h1>Login</h1>
    {
      isVerified && (
      <p className="text-center bg-green-300">
        Email Verificado ahora puedes ingresar
      </p>
      )
    }
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electronico</FormLabel>
              <FormControl>
                <Input placeholder="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input placeholder="contraseña" {...field} 
                 type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {
          error && <FormMessage>{error}</FormMessage>
        }
        <Button type="submit" disabled={isPending}>Submit</Button>
      </form>
    </Form>
    </div>
  )
}
