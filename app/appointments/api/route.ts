import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { dateOnlyToDbEndOfDay, dateOnlyToDbStartOfDay } from "@/app/helpers/dateTime"

const isValidPersonText = (value: unknown) =>
  typeof value === 'string' && /^[\p{L}\s'.-]{3,}$/u.test(value.trim())

// Complementa la relacion profiles con datos de contacto que viven en Auth.
const addDentistContact = async (
  supabase: ReturnType<typeof createAdminClient>,
  appointments: any[] | null,
) => {
  if (!appointments?.length) return appointments ?? []

  const { data: authData } = await supabase.auth.admin.listUsers()
  const userMap = new Map(authData?.users.map(user => [user.id, user]) ?? [])

  return appointments.map(appointment => {
    if (!appointment.dentist) return appointment

    const user = userMap.get(appointment.dentist.id)
    return {
      ...appointment,
      dentist: {
        ...appointment.dentist,
        email: user?.email ?? null,
        phone: user?.phone ?? null,
      },
    }
  })
}

// Sistema interno: tanto leer la agenda como crear citas exige sesión de personal.
const resolveAppointmentService = async (
  supabase: ReturnType<typeof createAdminClient>,
  serviceId: unknown,
) => {
  if (serviceId === null || serviceId === undefined) return { service: null }

  const numericServiceId = Number(serviceId)
  if (!Number.isInteger(numericServiceId)) {
    return { error: 'El servicio seleccionado no es válido', status: 400 }
  }

  // El precio y nombre se leen desde Service para no confiar en datos enviados desde el navegador.
  const { data: service, error } = await supabase
    .from('Service')
    .select('id, name, price')
    .eq('id', numericServiceId)
    .single()

  if (error || !service) {
    return { error: 'El servicio seleccionado no existe en el catálogo', status: 400 }
  }

  return {
    service: {
      id: service.id,
      name: service.name,
      price: Number(service.price) || 0,
    },
  }
}

const addAppointmentServiceDetails = async (
  supabase: ReturnType<typeof createAdminClient>,
  appointments: any[],
) => {
  const appointmentIds = appointments.map(appointment => appointment.id)
  if (!appointmentIds.length) return appointments

  const { data: rows } = await supabase
    .from('appointment_services')
    .select('appointment_id, service_id, quantity, unit_price')
    .in('appointment_id', appointmentIds)

  const serviceRowsByAppointment = new Map(
    (rows ?? []).map(row => [row.appointment_id, row]),
  )
  const serviceIds = Array.from(new Set((rows ?? [])
    .map(row => row.service_id)
    .filter((id): id is number => id !== null && id !== undefined)))

  const { data: services } = serviceIds.length
    ? await supabase.from('Service').select('id, name, price').in('id', serviceIds)
    : { data: [] }

  const servicesById = new Map((services ?? []).map(service => [service.id, service]))

  return appointments.map(appointment => {
    const serviceRow = serviceRowsByAppointment.get(appointment.id)
    const service = serviceRow?.service_id ? servicesById.get(serviceRow.service_id) : null

    return {
      ...appointment,
      appointmentService: serviceRow
        ? {
            serviceId: serviceRow.service_id,
            serviceName: service?.name ?? null,
            quantity: serviceRow.quantity,
            unitPrice: serviceRow.unit_price,
          }
        : null,
    }
  })
}

export async function GET(req: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const params = new URL(req.url).searchParams
  const startDate = params.get('startDate')
  const endDate = params.get('endDate')

  if (startDate) {
    let query = supabase
      .from('Appointment')
      .select('*, name:Patient(*), dentist:profiles!Appointment_dentistId_fkey(id, nombre, role)')
      .gte('startDate', dateOnlyToDbStartOfDay(startDate))
      .order('startDate', { ascending: true })

    query = endDate
      ? query.lte('startDate', dateOnlyToDbEndOfDay(endDate))
      : query.limit(7)

    const { data, error } = await query

    if (error) return new Response('Server error', { status: 500 })
    return Response.json(await addAppointmentServiceDetails(supabase, await addDentistContact(supabase, data)))
  }

  const { data, error } = await supabase
    .from('Appointment')
    .select('*, name:Patient(*), dentist:profiles!Appointment_dentistId_fkey(id, nombre, role)')

  if (error) return new Response('Server error', { status: 500 })
  return Response.json(await addAppointmentServiceDetails(supabase, await addDentistContact(supabase, data)))
}

export async function POST(req: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const appointment = await req.json()

  if (!isValidPersonText(appointment.name)) {
    return Response.json({ error: 'El nombre del paciente debe tener solo letras y mínimo 3 caracteres' }, { status: 400 })
  }
  if (!isValidPersonText(appointment.apellido_pat)) {
    return Response.json({ error: 'El apellido paterno es obligatorio, debe tener solo letras y mínimo 3 caracteres' }, { status: 400 })
  }
  if (!isValidPersonText(appointment.apellido_mat)) {
    return Response.json({ error: 'El apellido materno es obligatorio, debe tener solo letras y mínimo 3 caracteres' }, { status: 400 })
  }
  if (!appointment.dentistId) {
    return Response.json({ error: 'Selecciona el dentista que atenderá la cita' }, { status: 400 })
  }
  if (typeof appointment.reason !== 'string' || appointment.reason.trim().length < 3) {
    return Response.json({ error: 'El motivo de consulta es requerido' }, { status: 400 })
  }

  // El responsable de la cita debe existir en profiles y tener rol dentista.
  const { data: dentist, error: dentistError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', appointment.dentistId)
    .eq('role', 'dentista')
    .single()

  if (dentistError || !dentist) {
    return Response.json({ error: 'El dentista seleccionado no existe o no tiene rol dentista' }, { status: 400 })
  }

  const serviceResult = await resolveAppointmentService(supabase, appointment.serviceId)
  if (serviceResult.error) {
    return Response.json({ error: serviceResult.error }, { status: serviceResult.status ?? 400 })
  }
  const appointmentService = serviceResult.service

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
    dentistId: dentist.id,
    reason: appointment.reason.trim(),
    startDate: appointment.startDate,
    endDate: appointment.endDate,
  })

  if (appointmentError) {
    return Response.json({ error: appointmentError.message }, { status: 500 })
  }

  const { error: appointmentServiceError } = await supabase
    .from('appointment_services')
    .insert({
      appointment_id: appointment.id,
      service_id: appointmentService?.id ?? null,
      quantity: appointmentService ? 1 : 0,
      unit_price: appointmentService?.price ?? 0,
    })

  if (appointmentServiceError) {
    // Si falla el detalle del servicio, se revierte la cita para no dejar registros incompletos.
    await supabase.from('Appointment').delete().eq('id', appointment.id)
    return Response.json({ error: appointmentServiceError.message }, { status: 500 })
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
  if (appointment.reason !== undefined) {
    if (typeof appointment.reason !== 'string' || appointment.reason.trim().length < 3) {
      return Response.json({ error: 'El motivo de consulta es requerido' }, { status: 400 })
    }
    updatePayload.reason = appointment.reason.trim()
  }
  if (appointment.startDate !== undefined) updatePayload.startDate = appointment.startDate
  if (appointment.endDate !== undefined) updatePayload.endDate = appointment.endDate
  if (appointment.dentistId !== undefined) {
    // En ediciones, solo se acepta cambiar a usuarios que sigan siendo dentistas.
    const { data: dentist, error: dentistError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', appointment.dentistId)
      .eq('role', 'dentista')
      .single()

    if (dentistError || !dentist) {
      return Response.json({ error: 'El dentista seleccionado no existe o no tiene rol dentista' }, { status: 400 })
    }

    updatePayload.dentistId = dentist.id
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from('Appointment')
      .update(updatePayload)
      .eq('id', appointment.id)

    if (error) return new Response('Server error', { status: 500 })
  }

  if (appointment.serviceId !== undefined) {
    const serviceResult = await resolveAppointmentService(supabase, appointment.serviceId)
    if (serviceResult.error) {
      return Response.json({ error: serviceResult.error }, { status: serviceResult.status ?? 400 })
    }

    const service = serviceResult.service
    const servicePayload = {
      service_id: service?.id ?? null,
      quantity: service ? 1 : 0,
      unit_price: service?.price ?? 0,
    }

    // Mantiene appointment_services sincronizada cuando se edita el motivo/servicio de la cita.
    const { data: existingServiceRow, error: existingServiceError } = await supabase
      .from('appointment_services')
      .select('id')
      .eq('appointment_id', appointment.id)
      .maybeSingle()

    if (existingServiceError) {
      return Response.json({ error: existingServiceError.message }, { status: 500 })
    }

    const { error: serviceUpdateError } = existingServiceRow
      ? await supabase
          .from('appointment_services')
          .update(servicePayload)
          .eq('id', existingServiceRow.id)
      : await supabase
          .from('appointment_services')
          .insert({ appointment_id: appointment.id, ...servicePayload })

    if (serviceUpdateError) {
      return Response.json({ error: serviceUpdateError.message }, { status: 500 })
    }
  }

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
