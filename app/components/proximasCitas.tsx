"use client"

import { useEffect, useState } from "react"
import CitasDentales from "./CitasDentales"

export default function ProximasCitas() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]
        const res   = await fetch(`/appointments/api?startDate=${today}`)
        const data  = await res.json()
        setAppointments(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [])

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return <CitasDentales citas={appointments} />
}
