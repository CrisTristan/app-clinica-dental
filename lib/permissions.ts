import { type Role } from "@/lib/roles"

// ============================================================
// Fuente única de verdad de permisos por rol.
//
// Tanto el servidor (route.ts → requireRole(rolesFor('cobros')))
// como el cliente (menú/páginas → can(role, 'cobros')) leen de aquí.
// Cambiar un permiso = cambiar una sola línea en este archivo.
//
// La seguridad real la impone el servidor; el filtrado del cliente
// es solo UX (esconder lo que el rol no puede usar).
// ============================================================

export type Capability =
  | 'dashboard'         // Resumen operativo
  | 'agenda'            // Citas / calendario
  | 'pacientes'         // Datos personales del paciente (alta, edición, listado)
  | 'pacientes.eliminar' // Borrar pacientes (más sensible que editar)
  | 'clinica.ver'       // Ver información clínica, odontograma, historial dental
  | 'clinica.editar'    // Editar información clínica / odontograma
  | 'recetas'           // Recetas médicas
  | 'cobros'            // Servicios activos, abonos, recibos
  | 'reportes'          // Reportes de facturación
  | 'auditoria'         // Bitácora de auditoría
  | 'catalogo'          // Catálogo de servicios
  | 'inventario'        // Inventario de materiales de la clínica
  | 'anuncios'          // Anuncios
  | 'colaboradores'     // Gestión de usuarios/personal

const ALL: Role[] = ['admin', 'recepcionista', 'dentista']

// Matriz confirmada. Admin queda incluido en todo de forma explícita.
export const CAPABILITIES: Record<Capability, Role[]> = {
  'dashboard':         ['admin', 'dentista'],
  'agenda':            ALL,
  'pacientes':         ALL,
  'pacientes.eliminar': ['admin'],
  'clinica.ver':    ALL,                          // recepcionista: solo lectura
  'clinica.editar': ['admin', 'dentista'],
  'recetas':        ['admin', 'dentista'],
  'cobros':         ALL,
  'reportes':       ['admin', 'dentista'],
  'auditoria':      ['admin'],
  'catalogo':       ['admin', 'dentista'],
  'inventario':     ALL,
  'anuncios':       ALL,
  'colaboradores':  ['admin'],
}

// ¿El rol tiene la capacidad? (uso en cliente)
export const can = (role: Role | undefined | null, cap: Capability): boolean =>
  !!role && CAPABILITIES[cap].includes(role as Role)

// Roles permitidos para una capacidad (uso en rutas: requireRole(rolesFor('cobros')))
export const rolesFor = (cap: Capability): Role[] => CAPABILITIES[cap]
