export type Role = 'admin' | 'recepcionista' | 'dentista'

export const isAdmin        = (role?: string) => role === 'admin'
export const isRecepcionista = (role?: string) => role === 'recepcionista'
export const isDentista     = (role?: string) => role === 'dentista'

// Cualquier rol de personal puede acceder a las rutas de staff
export const hasAccess = (role?: string): role is Role =>
  role === 'admin' || role === 'recepcionista' || role === 'dentista'

export const ROLE_LABELS: Record<Role, string> = {
  admin:         'Administrador',
  recepcionista: 'Recepcionista',
  dentista:      'Dentista',
}
