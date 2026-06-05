import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  const supabase = createAdminClient()
  const { searchParams } = new URL(req.url)
  const id = Number.parseInt(searchParams.get('id') ?? '')

  if (!id) return Response.json(null)

  const { data, error } = await supabase
    .from('Teeth')
    .select('*')
    .eq('nameId', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data ?? null)
}

export async function POST(req: Request) {
  const supabase = createAdminClient()
  const { teethState, id } = await req.json()
  const nameId = Number(id)

  const { data: existing } = await supabase
    .from('Teeth')
    .select('id')
    .eq('nameId', nameId)
    .single()

  if (existing) {
    const { data } = await supabase
      .from('Teeth')
      .update({ teethState })
      .eq('nameId', nameId)
      .select()
      .single()

    return Response.json({ "teeth updated": data })
  }

  await supabase.from('Teeth').insert({ teethState, nameId })
  return Response.json("Saving Teeth")
}
