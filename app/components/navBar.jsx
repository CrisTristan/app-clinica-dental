"use client"

import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { authentication } from "@/app/actions/authentication"
import { SignOut } from "./signOut"
import { ThemeToggle } from "./theme-toggle"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { can } from "@/lib/permissions"

export default function NavBar() {
  const [session, setSession] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const refreshSession = async () => {
      // Leer rol desde la tabla profiles (no desde user_metadata)
      const auth = await authentication()
      if (!isMounted) return
      setSession(auth)
    }

    refreshSession()
    window.addEventListener("auth-state-changed", refreshSession)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshSession()
    })

    return () => {
      isMounted = false
      window.removeEventListener("auth-state-changed", refreshSession)
      subscription.unsubscribe()
    }
  }, [])

  const role    = session?.user?.role
  const isAdmin = role === "admin"

  // El menú lee de la matriz central (lib/permissions): una sola fuente de verdad.
  const navLinks = [
    {
      href: "/", label: "Inicio",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-9 9V10h4v9m-4 0h4" />
        </svg>
      ),
    },
    { href: "/agenda",            label: "Agenda",        show: can(role, 'agenda') },
    { href: "/directorio",        label: "Pacientes",     show: can(role, 'pacientes') && !isAdmin },
    { href: "/servicios-activos", label: "Servicios",     show: can(role, 'cobros') },
    { href: "/recetas",           label: "Recetas",       show: can(role, 'recetas') },
    { href: "/pacientes",         label: "Panel Admin",   show: isAdmin },
    { href: "/dashboard",         label: "Dashboard",     show: isAdmin },
    { href: "/reportes",          label: "Reportes",      show: can(role, 'reportes') },
    { href: "/auditoria",         label: "Auditoría",     show: can(role, 'auditoria') },
  ].filter(l => l.show !== false)

  const initials = session?.user?.email?.[0]?.toUpperCase() ?? "?"

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center shadow-sm overflow-hidden shrink-0">
              <svg className="w-5 h-5 text-white shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1C9.6 1 7.5 2.3 6.3 4.2 5.4 3.8 4.5 3.5 3.5 3.5 1.6 3.5 0 5.1 0 7c0 1.6 1 3 2.5 3.5.1 1.5.4 3 1 4.4.8 2.3 1.9 4.4 2.6 6.4.5 1.3 1.6 2.2 2.9 2.2s2.4-1 2.9-2.2l.5-1.7c.3-1 .5-1.5.6-1.5s.3.5.6 1.5l.5 1.7c.5 1.3 1.6 2.2 2.9 2.2s2.4-1 2.9-2.2c.7-2 1.8-4.1 2.6-6.4.6-1.4.9-2.9 1-4.4C23 9.9 24 8.6 24 7c0-1.9-1.6-3.5-3.5-3.5-1 0-1.9.3-2.8.7C16.5 2.3 14.4 1 12 1z" />
              </svg>
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold text-gray-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                Clínica Dental
              </span>
              <span className="block text-[10px] text-gray-400 dark:text-slate-500 font-normal tracking-wide">
                Sistema de Gestión
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href
                    ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                    : "text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                {icon && <span className="opacity-75">{icon}</span>}
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block w-px h-6 bg-gray-200 dark:bg-slate-700 mx-2" />

          {/* Auth area */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {!session ? (
              <Link
                href="/login"
                className="px-4 py-1.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 rounded-lg shadow-sm transition-all"
              >
                Iniciar Sesión
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-200 max-w-[140px] truncate">
                    {session.user?.email}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">{role}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-cyan-400 grid place-items-center text-white text-xs font-bold shrink-0 overflow-hidden">
                  <span className="leading-none">{initials}</span>
                </div>
                <SignOut />
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menú"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-slate-800 py-3 space-y-0.5">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href
                    ? "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                    : "text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
