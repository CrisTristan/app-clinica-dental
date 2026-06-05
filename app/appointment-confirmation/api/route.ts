import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  const supabase = createAdminClient()
  const confirmation = await req.json()

  const { data: patient } = await supabase
    .from('Patient')
    .select('*, Appointment(*)')
    .eq('telefono', confirmation.phoneNumber)
    .single()

  if (!patient) {
    return new Response(JSON.stringify(null), {
      headers: { "Content-Type": "application/json" },
      status: 201,
    })
  }

  const appointments = patient.Appointment as { id: string }[]
  const lastAppointmentId = appointments[appointments.length - 1]?.id

  if (!lastAppointmentId) {
    return new Response(JSON.stringify(patient), {
      headers: { "Content-Type": "application/json" },
      status: 201,
    })
  }

  const { data: updated, error } = await supabase
    .from('Appointment')
    .update({ status: confirmation.confirmation })
    .eq('id', lastAppointmentId)
    .select()
    .single()

  if (error) return new Response('Server error', { status: 500 })

  return new Response(JSON.stringify(updated), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  })
}
