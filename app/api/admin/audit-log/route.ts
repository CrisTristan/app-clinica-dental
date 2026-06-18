import { requireRole } from "@/lib/auth-guard"
import { rolesFor } from "@/lib/permissions"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextRequest } from "next/server"

const DATE_RE   = /^\d{4}-\d{2}-\d{2}$/
const ACTIONS   = ['crear', 'editar', 'eliminar']
const ENTITIES  = ['servicio', 'abono']
const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const auth = await requireRole(rolesFor('auditoria'))
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const params = new URL(req.url).searchParams
  const from   = params.get('from') ?? ''
  const to     = params.get('to') ?? ''
  const action = params.get('action') ?? ''
  const entity = params.get('entity') ?? ''
  const page   = Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1)

  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    return Response.json({ error: "from y to deben tener formato YYYY-MM-DD" }, { status: 400 })
  }
  if (action && !ACTIONS.includes(action)) {
    return Response.json({ error: "action inválida (crear, editar o eliminar)" }, { status: 400 })
  }
  if (entity && !ENTITIES.includes(entity)) {
    return Response.json({ error: "entity inválida (servicio o abono)" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const offset   = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('audit_log')
    .select('id, created_at, user_id, user_name, action, entity, entity_id, patient_name, service_name, details', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (from)   query = query.gte('created_at', `${from}T00:00:00`)
  if (to)     query = query.lte('created_at', `${to}T23:59:59.999`)
  if (action) query = query.eq('action', action)
  if (entity) query = query.eq('entity', entity)

  const { data, error, count } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({
    rows:     data ?? [],
    total:    count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  })
}
