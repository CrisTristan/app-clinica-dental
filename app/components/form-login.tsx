"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
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
  isVerified = false,
}: {
  isVerified?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setError(null)
    startTransition(async () => {
      const response = await loginAction(values)
      if (response.error) {
        setError(response.error)
        return
      }
      window.location.href = "/pacientes"
    })
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-sky-500 to-cyan-500 px-8 py-10 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1C9.6 1 7.5 2.3 6.3 4.2 5.4 3.8 4.5 3.5 3.5 3.5 1.6 3.5 0 5.1 0 7c0 1.6 1 3 2.5 3.5.1 1.5.4 3 1 4.4.8 2.3 1.9 4.4 2.6 6.4.5 1.3 1.6 2.2 2.9 2.2s2.4-1 2.9-2.2l.5-1.7c.3-1 .5-1.5.6-1.5s.3.5.6 1.5l.5 1.7c.5 1.3 1.6 2.2 2.9 2.2s2.4-1 2.9-2.2c.7-2 1.8-4.1 2.6-6.4.6-1.4.9-2.9 1-4.4C23 9.9 24 8.6 24 7c0-1.9-1.6-3.5-3.5-3.5-1 0-1.9.3-2.8.7C16.5 2.3 14.4 1 12 1z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Clínica Dental</h1>
            <p className="text-sky-100 text-sm mt-1">Bienvenido de vuelta</p>
          </div>

          {/* Form body */}
          <div className="px-8 py-8">

            {isVerified && (
              <div className="mb-6 flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Email verificado. Ya puedes iniciar sesión.
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-slate-200 font-medium text-sm">
                        Correo Electrónico
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ejemplo@correo.com"
                          className="h-11 rounded-lg focus:border-sky-400 focus-visible:ring-sky-300"
                          {...field}
                        />
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
                      <FormLabel className="text-gray-700 dark:text-slate-200 font-medium text-sm">
                        Contraseña
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          className="h-11 rounded-lg focus:border-sky-400 focus-visible:ring-sky-300"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg mt-2"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Ingresando...
                    </span>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>

              </form>
            </Form>

            <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-6">
              ¿No tienes cuenta?{" "}
              <a href="/register" className="text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 font-medium hover:underline transition-colors">
                Regístrate
              </a>
            </p>

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-600 mt-4">
          © {new Date().getFullYear()} Clínica Dental · Todos los derechos reservados
        </p>

      </div>
    </div>
  )
}
