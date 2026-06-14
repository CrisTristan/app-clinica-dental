import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { dateOnlyToDbStartOfDay } from "@/app/helpers/dateTime"

// Sistema interno: tanto leer la agenda como crear citas exige sesión de personal.
export async function GET(req: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const startDate = new URL(req.url).searchParams.get('startDate')

  if (startDate) {
    const { data, error } = await supabase
      .from('Appointment')
      .select('*, name:Patient(*)')
      .gte('startDate', dateOnlyToDbStartOfDay(startDate))
      .limit(7)

    if (error) return new Response('Server error', { status: 500 })
    return Response.json(data)
  }

  const { data, error } = await supabase
    .from('Appointment')
    .select('*, name:Patient(*)')

  if (error) return new Response('Server error', { status: 500 })
  return Response.json(data)
}

export async function POST(req: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const appointment = await req.json()

  let patientId = Number(appointment.patientId) || null

  if (patientId) {
    const { data: patient, error: patientError } = await supabase
      .from('Patient')
      .select('id')
      .eq('id', patientId)
      .single()

    if (patientError || !patient) {
      return Response.json({ error: 'El paciente seleccionado no existe' }, { status: 400 })
    }
  } else {
    const { data: existingPatient } = await supabase
      .from('Patient')
      .select('id')
      .eq('telefono', appointment.phone)
      .maybeSingle()

    if (existingPatient) {
      return Response.json(
        { error: 'Ya existe un paciente con ese teléfono. Selecciónalo como paciente registrado.' },
        { status: 409 },
      )
    }

    const { data: newPatient, error: patientError } = await supabase
      .from('Patient')
      .insert({ name: appointment.name, telefono: appointment.phone, apellido_pat: appointment.apellido_pat, apellido_mat: appointment.apellido_mat })
      .select('id')
      .single()

    if (patientError || !newPatient) {
      return Response.json({ error: patientError?.message ?? 'No se pudo crear el paciente' }, { status: 500 })
    }

    patientId = newPatient.id
  }

  const { error: appointmentError } = await supabase.from('Appointment').insert({
    id: appointment.id,
    nameId: patientId,
    desc: appointment.description,
    startDate: appointment.startDate,
    endDate: appointment.endDate,
  })

  if (appointmentError) {
    return Response.json({ error: appointmentError.message }, { status: 500 })
  }

  return Response.json(appointment, { status: 201 })
}

// PUT y DELETE requieren autenticación de personal
export async function PUT(req: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const appointment = await req.json()

  const { data: patient } = await supabase
    .from('Patient')
    .select('id')
    .eq('telefono', appointment.phone)
    .single()

  const updatePayload: Record<string, unknown> = {}

  if (patient?.id) updatePayload.nameId = patient.id
  if (appointment.status !== undefined) updatePayload.status = appointment.status
  if (appointment.description !== undefined) updatePayload.desc = appointment.description
  if (appointment.startDate !== undefined) updatePayload.startDate = appointment.startDate
  if (appointment.endDate !== undefined) updatePayload.endDate = appointment.endDate

  const { error } = await supabase
    .from('Appointment')
    .update(updatePayload)
    .eq('id', appointment.id)

  if (error) return new Response('Server error', { status: 500 })
  return new Response(JSON.stringify(appointment), {
    headers: { "Content-Type": "application/json" },
    status: 201,
  })
}

export async function DELETE(req: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

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
