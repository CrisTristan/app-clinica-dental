"use client"

import { useEffect, useState } from "react"
import { addDays, format, startOfWeek } from "date-fns"
import CitasDentales from "./CitasDentales"

export default function ProximasCitas() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const weekEnd = addDays(weekStart, 5)
        const startDate = format(weekStart, "yyyy-MM-dd")
        const endDate = format(weekEnd, "yyyy-MM-dd")
        const res   = await fetch(`/appointments/api?startDate=${startDate}&endDate=${endDate}`)
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
