import { requireStaff } from "@/lib/auth-guard"

// Proxy al catálogo de localidades de INEGI (wscatgeo). Se hace del lado del
// servidor para evitar problemas de CORS y normalizar la respuesta.
//
//   GET ?edo=<cve_ent>&mun=<cve_mun>
//       → { localidades: [{ cve_loc, nomgeo }] }  (lista para el select)
//   GET ?edo=<cve_ent>&mun=<cve_mun>&loc=<cve_loc>
//       → { cve_loc, nomgeo }  (nombre real de una localidad ya guardada)
const BASE = "https://gaia.inegi.org.mx/wscatgeo/v2/localidades"

export async function GET(request: Request) {
  const auth = await requireStaff()
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const edo = searchParams.get("edo")?.trim()
  const mun = searchParams.get("mun")?.trim()
  const loc = searchParams.get("loc")?.trim()

  if (!edo || !mun) {
    return Response.json({ error: "edo y mun son requeridos" }, { status: 400 })
  }

  // Con loc: se concatenan las tres claves (cve_ent+cve_mun+cve_loc = cvegeo)
  // para resolver una sola localidad. Sin loc: se lista el municipio completo.
  const url = loc ? `${BASE}/${edo}${mun}${loc}` : `${BASE}/${edo}/${mun}`

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } })
    if (!res.ok) {
      return Response.json({ error: `INEGI respondió ${res.status}` }, { status: 502 })
    }
    const json = await res.json()
    const datos: any[] = Array.isArray(json?.datos) ? json.datos : []

    if (loc) {
      const item = datos[0]
      return Response.json({ cve_loc: item?.cve_loc ?? loc, nomgeo: item?.nomgeo ?? "" })
    }

    const localidades = datos.map(d => ({ cve_loc: d.cve_loc as string, nomgeo: d.nomgeo as string }))
    return Response.json({ localidades })
  } catch (e) {
    console.error("Error consultando INEGI localidades:", e)
    return Response.json({ error: "No se pudo consultar el catálogo de localidades" }, { status: 502 })
  }
}
