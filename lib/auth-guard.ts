import { createClient } from "@/lib/supabase/server"
import { type Role } from "@/lib/roles"

type AuthSuccess = { ok: true;  userId: string; role: Role }
type AuthFailure = { ok: false; error: string;  status: 401 | 403 }
type AuthResult  = AuthSuccess | AuthFailure

export async function requireStaff(): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'No autenticado', status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return { ok: false, error: 'Sin acceso', status: 403 }

  return { ok: true, userId: user.id, role: profile.role as Role }
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireStaff()
  if (!result.ok) return result
  if (result.role !== 'admin') {
    return { ok: false, error: 'Permisos insuficientes', status: 403 }
  }
  return result
}
