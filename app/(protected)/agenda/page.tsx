"use client"
import Scheduler from "../../components/scheduler"
import { useEffect, useState } from "react"
import { authentication } from "@/app/actions/authentication"
import { hasAccess } from "@/lib/roles"

export default function Agenda() {
  const [canAccess, setCanAccess] = useState(false)

  useEffect(() => {
    const fetchSession = async () => {
      const session = await authentication()
      if (hasAccess(session?.user?.role)) {
        setCanAccess(true)
      }
    }
    fetchSession()
  }, [])

  return (
    <div>
      {canAccess
        ? <Scheduler />
        : <p>No tienes permiso para acceder a esta página</p>
      }
    </div>
  )
}
