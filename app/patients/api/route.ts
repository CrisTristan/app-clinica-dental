import { Patient } from "@/app/types/types"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = Number.parseInt(searchParams.get('id') ?? '')

  if (id) {
    const { data, error } = await supabase
      .from('Patient')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  const { data, error } = await supabase
    .from('Patient')
    .select('*, Appointment(*)')

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: Request) {
  const supabase = createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('Patient')
    .insert({
      name: body.name,
      telefono: body.phone,
      apellido_pat: body.apellidoPat,
      apellido_mat: body.apellidoMat,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PUT(req: Request) {
  const supabase = createAdminClient()
  const { id, name, apellido_pat, apellido_mat, telefono, edad, domicilio, sexo, fechaNacimiento, email }: Patient = await req.json()

  const { data, error } = await supabase
    .from('Patient')
    .update({ name, apellido_pat, apellido_mat, telefono, edad: Number(edad), domicilio, sexo, fechaNacimiento, email })
    .eq('id', id)
    .select()
    .single()

  if(error) console.error("Error updating patient:", error);  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(req: Request) {
  const supabase = createAdminClient()
  const body = await req.json()
  const ids: string[] = body.ids

  const { error } = await supabase
    .from('Patient')
    .delete()
    .in('id', ids.map(Number))

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ message: "Pacientes borrados" })
}
