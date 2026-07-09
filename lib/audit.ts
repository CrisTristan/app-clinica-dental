import { SupabaseClient } from "@supabase/supabase-js"

export type AuditAction = 'crear' | 'editar' | 'eliminar'
export type AuditEntity = 'servicio' | 'abono'

export type AuditEntry = {
  userId: string
  userName?: string | null
  action: AuditAction
  entity: AuditEntity
  entityId: string
  patientName?: string | null
  serviceName?: string | null
  details?: Record<string, unknown>
}

// Registra una entrada en la bitácora. Nunca interrumpe la operación
// principal: si la inserción falla solo se reporta en el log del servidor.
export async function logAudit(supabase: SupabaseClient, entry: AuditEntry) {
  const { error } = await supabase.from('audit_log').insert({
    user_id:      entry.userId,
    user_name:    entry.userName ?? null,
    action:       entry.action,
    entity:       entry.entity,
    entity_id:    String(entry.entityId),
    patient_name: entry.patientName ?? null,
    service_name: entry.serviceName ?? null,
    details:      entry.details ?? {},
  })
  if (error) console.error('[audit_log] No se pudo registrar la auditoría:', error.message)
}

export const fullPatientName = (p?: { nombre?: string; apellido_pat?: string; apellido_mat?: string } | null) =>
  [p?.nombre, p?.apellido_pat, p?.apellido_mat].filter(Boolean).join(' ') || null
