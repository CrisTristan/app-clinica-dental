import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const supabase = createAdminClient()
  const url = new URL(req.url)
  const startDate = url.searchParams.get('startDate')

  if (!startDate) {
    const { data, error } = await supabase
      .from('Appointment')
      .select('*, name:Patient(*)')

    if (error) return new Response('Server error', { status: 500 })
    return Response.json(data)
  }

  const { data, error } = await supabase
    .from('Appointment')
    .select('*, name:Patient(*)')
    .gte('startDate', new Date(startDate).toISOString())
    .limit(7)

  if (error) return new Response('Server error', { status: 500 })
  return Response.json(data)
}

export async function POST(req: Request) {
  const supabase = createAdminClient()
  const appointment = await req.json()

  const { data: patient } = await supabase
    .from('Patient')
    .select('id')
    .eq('telefono', appointment.phone)
    .single()

  if (patient) {
    await supabase.from('Appointment').insert({
      id: appointment.id,
      nameId: patient.id,
      desc: appointment.description,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
    })
  } else {
    const { data: newPatient } = await supabase
      .from('Patient')
      .insert({ name: appointment.name, telefono: appointment.phone })
      .select('id')
      .single()

    if (newPatient) {
      await supabase.from('Appointment').insert({
        id: appointment.id,
        nameId: newPatient.id,
        desc: appointment.description,
        startDate: appointment.startDate,
        endDate: appointment.endDate,
      })
    }
  }

  return new Response(JSON.stringify(appointment), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  })
}

export async function PUT(req: Request) {
  const supabase = createAdminClient()
  const appointment = await req.json()

  const { data: patient } = await supabase
    .from('Patient')
    .select('id')
    .eq('telefono', appointment.phone)
    .single()

  const { error } = await supabase
    .from('Appointment')
    .update({
      nameId: patient?.id,
      status: appointment.status,
      desc: appointment.description,
      startDate: appointment.startDate,
      endDate: appointment.endDate,
    })
    .eq('id', appointment.id)

  if (error) return new Response('Server error', { status: 500 })
  return new Response(JSON.stringify(appointment), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  })
}

export async function DELETE(req: Request) {
  const supabase = createAdminClient()
  const body = await req.json()

  const { error } = await supabase
    .from('Appointment')
    .delete()
    .eq('id', body.id)

  if (error) return new Response('Server error', { status: 500 })
  return new Response("Registro eliminado", {
    headers: { "Content-Type": "application/json" },
    status: 201,
  })
}
