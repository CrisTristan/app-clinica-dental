import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { rolesFor } from '@/lib/permissions'

// Rutas accesibles sin autenticación. El sistema es interno: lo único público
// es el landing y el login. Todo lo demás (incluidas las APIs de citas) exige
// sesión de personal.
const publicRoutes = [
  '/',
  '/login',
]

// Rutas que requieren rol 'admin' (cualquier otro rol es redirigido a /agenda).
// Nota: '/pacientes' (lista/Panel Admin) se gestiona aparte para permitir que
// el personal abra la ficha individual /pacientes/<id> (plan B).
const adminOnlyRoutes = [
  '/dashboard',
  '/register',
  '/auditoria',
  '/api/admin',
]

// Páginas divididas por rol, derivadas de la matriz central (lib/permissions).
// Un rol no permitido es redirigido a /agenda.
const roleRoutes: { prefix: string; roles: readonly string[] }[] = [
  { prefix: '/servicios-activos', roles: rolesFor('cobros') },
  { prefix: '/recetas',           roles: rolesFor('recetas') },
  { prefix: '/reportes',          roles: rolesFor('reportes') },
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api/') || pathname.endsWith('/api')

  const isPublic = publicRoutes.some(
    route => pathname === route || pathname.startsWith(route + '/')
  )

  // Sin sesión → login
  if (!user && !isPublic) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Consultar rol desde la tabla profiles (RLS permite leer el propio perfil)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role as string | undefined

    // Usuario autenticado sin perfil no puede acceder a rutas protegidas
    if (!isPublic && !role) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
      }

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Rutas solo para admin
    const isAdminRoute = adminOnlyRoutes.some(
      route => pathname === route || pathname.startsWith(route + '/')
    )

    if (isAdminRoute && role !== 'admin') {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
      }

      const url = request.nextUrl.clone()
      const isStaff = role === 'recepcionista' || role === 'dentista'
      url.pathname = isStaff ? '/agenda' : '/login'
      return NextResponse.redirect(url)
    }

    // Panel Admin (lista /pacientes) es solo admin; la ficha individual
    // /pacientes/<id> la consulta todo el personal (plan B).
    if (pathname === '/pacientes' && role !== 'admin') {
      const url = request.nextUrl.clone()
      const isStaff = role === 'recepcionista' || role === 'dentista'
      url.pathname = isStaff ? '/agenda' : '/login'
      return NextResponse.redirect(url)
    }

    // Páginas divididas por rol (cobros, recetas, reportes)
    const roleRoute = roleRoutes.find(
      r => pathname === r.prefix || pathname.startsWith(r.prefix + '/')
    )

    if (roleRoute && role && !roleRoute.roles.includes(role)) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
      }

      const url = request.nextUrl.clone()
      url.pathname = '/agenda'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
