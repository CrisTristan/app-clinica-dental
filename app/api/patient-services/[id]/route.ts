import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { name, price } = await req.json()
  if (!name || !price || price <= 0) {
    return Response.json({ error: "name y price válidos son requeridos" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: payments } = await supabase
    .from('Payment_History')
    .select('abono')
    .eq('patient_service_id', id)

  const totalPaid  = (payments ?? []).reduce((sum: number, p: any) => sum + (p.abono ?? 0), 0)
  const newBalance = Math.max(0, price - totalPaid)

  const { data, error } = await supabase
    .from('Patient_Services')
    .update({ name, price, balance: newBalance })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const supabase = createAdminClient()

  await supabase.from('Payment_History').delete().eq('patient_service_id', id)

  const { error } = await supabase
    .from('Patient_Services')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
