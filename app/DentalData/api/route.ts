import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const patientId = Number.parseInt(searchParams.get('id') ?? '')

  const { data, error } = await supabase
    .from('DentalData')
    .select('*')
    .eq('nameId', patientId)
    .single()

  if (error && error.code !== 'PGRST116') {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data ?? null)
}

export async function PUT(req: Request) {
  const supabase = createAdminClient()
  const { examenTejidos, motivoConsulta, habitos, enfermedadesPersonales, higieneBucal, alergias, alimentacion, id } = await req.json()
  const nameId = Number(id)

  const { data: existing } = await supabase
    .from('DentalData')
    .select('id')
    .eq('nameId', nameId)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('DentalData')
      .update({ motivoConsulta, examenTejidos, habitos, enfermedadesPersonales, higieneBucal, alergias, alimentacion })
      .eq('nameId', nameId)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  const { data, error } = await supabase
    .from('DentalData')
    .insert({ motivoConsulta, examenTejidos, habitos, enfermedadesPersonales, higieneBucal, alergias, alimentacion, nameId })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
