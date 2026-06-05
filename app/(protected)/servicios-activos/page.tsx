"use client"

import ServiciosActivos from "../../components/patient_service"
import { useEffect, useState } from "react"
import { PatientService } from "@/app/types/types"
import { authentication } from "@/app/actions/authentication"
import { hasAccess } from "@/lib/roles"

export default function ServiciosActivosPage() {
  const [canAccess, setCanAccess] = useState(false)
  const [activeServices, setActiveServices] = useState<PatientService[]>([])

  useEffect(() => {
    const init = async () => {
      const session = await authentication()
      if (!hasAccess(session?.user?.role)) return
      setCanAccess(true)

      const res = await fetch('/patients/api')
      const data = await res.json()
      const services: PatientService[] = []
      data.forEach((patient: { name: string; servicios: { name: string; price: number; balance: number }[] }) => {
        if (patient.servicios?.length > 0) {
          patient.servicios.forEach(service => {
            services.push({
              name: patient.name,
              activeService: service.name,
              totalCost: service.price,
              balance: service.balance,
            })
          })
        }
      })
      setActiveServices(services)
    }
    init()
  }, [])

  if (!canAccess) return <p>No tienes permiso para acceder a esta página</p>

  return (
    <div>
      {activeServices.map((patient, index) => (
        <ServiciosActivos key={index} {...patient} />
      ))}
    </div>
  )
}
