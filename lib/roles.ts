export type Role = 'admin' | 'recepcionista'

export const isAdmin = (role?: string) => role === 'admin'
export const isRecepcionista = (role?: string) => role === 'recepcionista'
export const hasAccess = (role?: string) => role === 'admin' || role === 'recepcionista'
