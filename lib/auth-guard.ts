import { createClient } from "@/lib/supabase/server"
import { type Role } from "@/lib/roles"

type AuthSuccess = { ok: true;  userId: string; role: Role; nombre: string | null }
type AuthFailure = { ok: false; error: string;  status: 401 | 403 }
type AuthResult  = AuthSuccess | AuthFailure

// Guard genérico: exige sesión + que el rol del perfil esté entre los permitidos.
// Es la base de todos los demás guards. Las rutas declaran sus roles vía
// requireRole(rolesFor('capacidad')) usando la matriz de lib/permissions.
export async function requireRole(roles: readonly Role[]): Promise<AuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'No autenticado', status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nombre')
    .eq('id', user.id)
    .single()

  if (!profile) return { ok: false, error: 'Sin acceso', status: 403 }

  const role = profile.role as Role
  if (!roles.includes(role)) {
    return { ok: false, error: 'Permisos insuficientes', status: 403 }
  }

  return { ok: true, userId: user.id, role, nombre: profile.nombre ?? null }
}

// Cualquier rol de personal con perfil.
export async function requireStaff(): Promise<AuthResult> {
  return requireRole(['admin', 'recepcionista', 'dentista'])
}

// Solo administrador.
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole(['admin'])
}
