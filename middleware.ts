import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas accesibles sin autenticación
const publicRoutes = [
  '/',
  '/login',
  '/testing',
  '/appointment-confirmation/api',
  '/appointments/api',
]

// Rutas que requieren rol 'admin' (cualquier otro rol es redirigido a /agenda)
const adminOnlyRoutes = [
  '/dashboard',
  '/pacientes',
  '/register',
  '/auditoria',
  '/api/admin',
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value, options)
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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
