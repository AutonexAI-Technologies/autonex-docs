import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccess, ROLE_ROUTES } from '@/lib/roleAccess'

export async function middleware(request: NextRequest) {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || !supabaseUrl.startsWith('http')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // ── Public routes (no auth needed) ───────────────────────────────────────
  const isPublic = (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/change-password')
  )

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Role-based route protection ───────────────────────────────────────────
  // Only apply if user is logged in and visiting a protected page
  if (user && !isPublic && pathname !== '/dashboard') {
    const email = user.email?.toLowerCase()
    if (email) {
      const { data: member } = await supabase
        .from('team_members')
        .select('roles(name)')
        .eq('email', email)
        .single()

      const roleName: string | null = (member as any)?.roles?.name ?? null

      // If NO team_members record exists → user is likely the original admin/founder
      // Grant full access (they created the platform, they see everything)
      if (!member) {
        return supabaseResponse
      }

      // If role IS found but doesn't have access → redirect to dashboard
      if (roleName && !canAccess(roleName, pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('access_denied', '1')
        return NextResponse.redirect(url)
      }

      // If member exists but has no role assigned yet → send to dashboard (safe fallback)
      if (member && !roleName && pathname !== '/dashboard') {
        // Allow – they at least have a team record, let them see what they can
        return supabaseResponse
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}