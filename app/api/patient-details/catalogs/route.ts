import { requireStaff } from "@/lib/auth-guard"
import { createAdminClient } from "@/lib/supabase/admin"

// Catálogos para los selects del formulario de detalles del paciente.
//
//   GET /api/patient-details/catalogs
//       → { estados, nacionalidades }
//   GET /api/patient-details/catalogs?municipios=<catalog_key del estado>
//       → { municipios } (filtrados por entidad para no traer miles de filas)
export async function GET(request: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const estadoKey = searchParams.get('municipios')

  if (estadoKey) {
    const { data, error } = await supabase
      .from('municipios')
      .select('catalog_key, municipio')
      .eq('efe_key', estadoKey)
      .order('municipio', { ascending: true })

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ municipios: data ?? [] })
  }

  const [estados, nacionalidades] = await Promise.all([
    supabase
      .from('entidades_federativas')
      .select('catalog_key, entidad_federativa')
      .order('entidad_federativa', { ascending: true }),
    supabase
      .from('nacionalidades')
      .select('codigo_pais, pais')
      .order('pais', { ascending: true }),
  ])

  if (estados.error) return Response.json({ error: estados.error.message }, { status: 500 })
  if (nacionalidades.error) return Response.json({ error: nacionalidades.error.message }, { status: 500 })

  return Response.json({
    estados: estados.data ?? [],
    nacionalidades: nacionalidades.data ?? [],
  })
}
