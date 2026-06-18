import { NextRequest } from "next/server"
import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit, fullPatientName } from "@/lib/audit"

type RequestedService = {
  id?: string | number
  serviceId: number
  quantity?: number
}

type CatalogService = {
  id: number
  name: string
  price: number
}

type StaffAuth = Awaited<ReturnType<typeof requireStaff>>

const normalizeRequestedServices = (value: unknown): RequestedService[] => {
  if (!Array.isArray(value)) return []

  const seen = new Set<number>()
  return value.reduce<RequestedService[]>((items, item) => {
    const serviceId = Number((item as RequestedService)?.serviceId)
    if (!Number.isInteger(serviceId) || seen.has(serviceId)) return items

    seen.add(serviceId)
    items.push({
      id: (item as RequestedService).id,
      serviceId,
      quantity: Math.max(1, Number((item as RequestedService).quantity) || 1),
    })
    return items
  }, [])
}

const withServiceDetails = async (
  supabase: ReturnType<typeof createAdminClient>,
  rows: any[],
) => {
  const serviceIds = Array.from(new Set(
    rows
      .map(row => row.service_id)
      .filter((id): id is number => id !== null && id !== undefined),
  ))

  const { data: services } = serviceIds.length
    ? await supabase.from("Service").select("id, name, price").in("id", serviceIds)
    : { data: [] }

  const servicesById = new Map((services ?? []).map(service => [service.id, service]))

  return rows.map(row => {
    const service = servicesById.get(row.service_id)

    return {
      id: row.id,
      appointmentId: row.appointment_id,
      serviceId: row.service_id,
      serviceName: service?.name ?? "Servicio no encontrado",
      quantity: row.quantity ?? 1,
      unitPrice: row.unit_price ?? service?.price ?? 0,
    }
  })
}

const appointmentPatientServiceId = (appointmentId: string, serviceId: number) =>
  `appointment:${appointmentId}:service:${serviceId}`

const syncPatientServicesForCompletedAppointment = async ({
  supabase,
  auth,
  appointmentId,
  requestedServices,
  catalogById,
  removedServiceIds,
}: {
  supabase: ReturnType<typeof createAdminClient>
  auth: Extract<StaffAuth, { ok: true }>
  appointmentId: string
  requestedServices: RequestedService[]
  catalogById: Map<number, CatalogService>
  removedServiceIds: number[]
}) => {
  const { data: appointment, error: appointmentError } = await supabase
    .from("Appointment")
    .select("nameId, name:Patient(name, apellido_pat, apellido_mat)")
    .eq("id", appointmentId)
    .single()

  if (appointmentError || !appointment?.nameId) {
    return { error: appointmentError?.message ?? "No se encontro la cita" }
  }

  const patientName = fullPatientName((appointment as any).name)
  const removedPatientServiceIds = removedServiceIds.map(serviceId =>
    appointmentPatientServiceId(appointmentId, serviceId),
  )

  if (removedPatientServiceIds.length) {
    const { data: servicesToDelete } = await supabase
      .from("Patient_Services")
      .select("id, name, price, balance")
      .in("id", removedPatientServiceIds)

    // Los servicios activos creados desde una cita usan IDs deterministas.
    // Si el usuario quita el servicio del popup, se elimina tambien de /servicios-activos.
    // Se borran sus pagos igual que el endpoint existente de Patient_Services DELETE.
    await supabase
      .from("Payment_History")
      .delete()
      .in("patient_service_id", removedPatientServiceIds)

    const { error: deleteError } = await supabase
      .from("Patient_Services")
      .delete()
      .in("id", removedPatientServiceIds)

    if (deleteError) return { error: deleteError.message }

    for (const service of servicesToDelete ?? []) {
      await logAudit(supabase, {
        userId: auth.userId,
        userName: auth.nombre,
        action: "eliminar",
        entity: "servicio",
        entityId: service.id,
        patientName,
        serviceName: service.name,
        details: {
          origen: "cita_completada",
          appointment_id: appointmentId,
          precio: service.price,
          saldo_pendiente: service.balance,
        },
      })
    }
  }

  const patientServiceIds = requestedServices.map(service =>
    appointmentPatientServiceId(appointmentId, service.serviceId),
  )

  const [{ data: existingPatientServices }, { data: payments }] = await Promise.all([
    patientServiceIds.length
      ? supabase
          .from("Patient_Services")
          .select("id, name, price")
          .in("id", patientServiceIds)
      : { data: [] },
    patientServiceIds.length
      ? supabase
          .from("Payment_History")
          .select("patient_service_id, abono")
          .in("patient_service_id", patientServiceIds)
      : { data: [] },
  ])

  const existingById = new Map((existingPatientServices ?? []).map(service => [service.id, service]))
  const paidByPatientServiceId = new Map<string, number>()

  for (const payment of payments ?? []) {
    const key = String(payment.patient_service_id)
    paidByPatientServiceId.set(key, (paidByPatientServiceId.get(key) ?? 0) + Number(payment.abono ?? 0))
  }

  for (const requestedService of requestedServices) {
    const catalogService = catalogById.get(requestedService.serviceId)
    if (!catalogService) continue

    const patientServiceId = appointmentPatientServiceId(appointmentId, requestedService.serviceId)
    const quantity = requestedService.quantity ?? 1
    const price = Number(catalogService.price ?? 0) * quantity
    const paid = paidByPatientServiceId.get(patientServiceId) ?? 0
    const payload = {
      name: catalogService.name,
      price,
      balance: Math.max(0, price - paid),
    }
    const existing = existingById.get(patientServiceId)

    if (existing) {
      const { error } = await supabase
        .from("Patient_Services")
        .update(payload)
        .eq("id", patientServiceId)

      if (error) return { error: error.message }

      await logAudit(supabase, {
        userId: auth.userId,
        userName: auth.nombre,
        action: "editar",
        entity: "servicio",
        entityId: patientServiceId,
        patientName,
        serviceName: catalogService.name,
        details: {
          origen: "cita_completada",
          appointment_id: appointmentId,
          antes: { nombre: existing.name, precio: existing.price },
          despues: { nombre: payload.name, precio: payload.price },
          balance_nuevo: payload.balance,
        },
      })
    } else {
      const { error } = await supabase
        .from("Patient_Services")
        .insert({
          id: patientServiceId,
          patient_id: appointment.nameId,
          ...payload,
        })

      if (error) return { error: error.message }

      await logAudit(supabase, {
        userId: auth.userId,
        userName: auth.nombre,
        action: "crear",
        entity: "servicio",
        entityId: patientServiceId,
        patientName,
        serviceName: catalogService.name,
        details: {
          origen: "cita_completada",
          appointment_id: appointmentId,
          precio: payload.price,
        },
      })
    }
  }

  return { error: null }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  const [{ data, error }, { data: catalogServices, error: catalogError }] = await Promise.all([
    supabase
      .from("appointment_services")
      .select("id, appointment_id, service_id, quantity, unit_price")
      .eq("appointment_id", id)
      .not("service_id", "is", null)
      .order("id", { ascending: true }),
    supabase
      .from("Service")
      .select("id, name, price")
      .order("name", { ascending: true }),
  ])

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (catalogError) return Response.json({ error: catalogError.message }, { status: 500 })

  return Response.json({
    appointmentServices: await withServiceDetails(supabase, data ?? []),
    catalogServices: catalogServices ?? [],
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()
  const requestedServices = normalizeRequestedServices(body.services)
  const supabase = createAdminClient()

  const serviceIds = requestedServices.map(service => service.serviceId)
  const { data: catalogServices, error: catalogError } = serviceIds.length
    ? await supabase.from("Service").select("id, name, price").in("id", serviceIds)
    : { data: [], error: null }

  if (catalogError) return Response.json({ error: catalogError.message }, { status: 500 })

  const catalogById = new Map((catalogServices ?? []).map(service => [service.id, service]))
  if (catalogById.size !== serviceIds.length) {
    return Response.json({ error: "Uno o mas servicios seleccionados no existen" }, { status: 400 })
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("appointment_services")
    .select("id, service_id")
    .eq("appointment_id", id)

  if (existingError) return Response.json({ error: existingError.message }, { status: 500 })

  const requestedExistingIds = new Set(
    requestedServices
      .map(service => service.id)
      .filter((rowId): rowId is string | number => rowId !== undefined && rowId !== null),
  )
  const rowsToDelete = (existingRows ?? [])
    .filter(row => !requestedExistingIds.has(row.id))
  const rowIdsToDelete = rowsToDelete.map(row => row.id)
  const removedServiceIds = rowsToDelete
    .map(row => row.service_id)
    .filter((serviceId): serviceId is number => serviceId !== null && serviceId !== undefined)

  if (rowIdsToDelete.length) {
    const { error } = await supabase
      .from("appointment_services")
      .delete()
      .in("id", rowIdsToDelete)

    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  for (const service of requestedServices) {
    const catalogService = catalogById.get(service.serviceId)
    const payload = {
      service_id: service.serviceId,
      quantity: service.quantity ?? 1,
      unit_price: catalogService?.price ?? 0,
    }

    const rowId = service.id
    if (rowId) {
      const { error } = await supabase
        .from("appointment_services")
        .update(payload)
        .eq("id", rowId)
        .eq("appointment_id", id)

      if (error) return Response.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from("appointment_services")
        .insert({ appointment_id: id, ...payload })

      if (error) return Response.json({ error: error.message }, { status: 500 })
    }
  }

  const syncResult = await syncPatientServicesForCompletedAppointment({
    supabase,
    auth,
    appointmentId: id,
    requestedServices,
    catalogById,
    removedServiceIds,
  })

  if (syncResult.error) {
    return Response.json({ error: syncResult.error }, { status: 500 })
  }

  const { error: appointmentError } = await supabase
    .from("Appointment")
    .update({ status: "Completed" })
    .eq("id", id)

  if (appointmentError) return Response.json({ error: appointmentError.message }, { status: 500 })

  const { data: rows, error: rowsError } = await supabase
    .from("appointment_services")
    .select("id, appointment_id, service_id, quantity, unit_price")
    .eq("appointment_id", id)
    .not("service_id", "is", null)
    .order("id", { ascending: true })

  if (rowsError) return Response.json({ error: rowsError.message }, { status: 500 })

  return Response.json({
    status: "Completed",
    services: await withServiceDetails(supabase, rows ?? []),
  })
}
