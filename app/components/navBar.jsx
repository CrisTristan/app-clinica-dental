"use client"

import Link from "next/link"
import { authentication } from "../actions/authentication"
import { SignOut } from "./signOut"
import Image from "next/image"
import { useEffect, useState } from "react"

export default function NavBar() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    const fetchSession = async () => {
      const data = await authentication()
      setSession(data)
    }

    if (!session) {
      const intervalId = setInterval(fetchSession, 2000)
      return () => clearInterval(intervalId)
    }
  }, [session])

  const role = session?.user?.role
  const isAdmin = role === "admin"
  const hasAccess = role === "admin" || role === "recepcionista"

  return (
    <header className="bg-primary text-primary-foreground py-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          <Image
            src={"https://th.bing.com/th/id/OIP.SOLDwLuhaxavlwt3TOunUwHaHa?rs=1&pid=ImgDetMain"}
            alt="Logo de la Clínica Dental"
            width={100}
            height={100}
          />
        </Link>
        <nav>
          <ul className="flex space-x-4">
            <li><Link href="/" className="hover:underline text-white">Inicio</Link></li>
            <li>
              {!session
                ? <Link href="/login" className="hover:underline text-white">Login</Link>
                : <SignOut />
              }
            </li>
            {hasAccess && (
              <li>
                <Link href="/agenda" className="hover:underline text-white">Agenda</Link>
              </li>
            )}
            {hasAccess && (
              <li>
                <Link href="/servicios-activos" className="hover:underline text-white">Servicios Activos</Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link href="/pacientes" className="hover:underline text-white">Panel Admin</Link>
              </li>
            )}
            {isAdmin && (
              <li>
                <Link href="/dashboard" className="hover:underline text-white">Dashboard</Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}
