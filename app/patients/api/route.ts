import { Patient } from "@/app/types/types"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const id = Number.parseInt(searchParams.get('id') ?? '')
  const query = searchParams.get('q')?.trim()

  if (id) {
    const { data, error } = await supabase
      .from('Patient')
      .select('*')
      .eq('id', id)
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json(data)
  }

  // if (query) {
  //   const search = query.replace(/[^\p{L}\p{N}\s'-]/gu, '')
  //   if (!search) return Response.json([])
  //   console.log("Buscando pacientes para:", search);
  //   const { data, error } = await supabase
  //     .from('Patient')
  //     .select('id, name, apellido_pat, apellido_mat, telefono')
  //     .or(`name.ilike.%${search}%`)
  //     .order('name')
  //     .limit(8)

  //   if (error) return Response.json({ error: error.message }, { status: 500 })
  //   return Response.json(data)
  // }
  if (query) {
    const search = query.replace(/[^\p{L}\p{N}\s'-]/gu, '').trim();
    if (!search) return Response.json([]);

    // Dividir la búsqueda en términos individuales
    const terms = search.split(/\s+/);

    // Crear condiciones OR para cada término
    const conditions = terms.map(term => `name.ilike.%${term}%`).join(',');

    console.log("Buscando pacientes para:", search);
    const { data, error } = await supabase
      .from('Patient')
      .select('id, name, apellido_pat, apellido_mat, telefono')
      .or(conditions)
      .order('name')
      .limit(8);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
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

  if (error) console.error("Error updating patient:", error);
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
