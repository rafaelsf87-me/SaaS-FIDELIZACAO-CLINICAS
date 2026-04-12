import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Revalida a sessão — obrigatório no middleware para manter refresh tokens funcionando
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas protegidas
  const isAdminRoute = pathname.startsWith('/admin')
  const isClinicRoute = pathname.startsWith('/clinic')
  const isLoginPage = pathname === '/login'

  // Não autenticado tentando acessar rota protegida → /login
  if ((isAdminRoute || isClinicRoute) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // Autenticado tentando acessar /login → redireciona por role
  if (isLoginPage && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname =
      profile?.role === 'super_admin' ? '/admin/dashboard' : '/clinic/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // Verificação de role para /admin/*
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    if (profile?.role !== 'super_admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/clinic/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Verificação de role para /clinic/*
  if (isClinicRoute && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>()

    if (!['admin', 'secretary'].includes(profile?.role ?? '')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/admin/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Inclui todas as rotas exceto assets estáticos e APIs internas do Next.js
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
