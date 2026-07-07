import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccess, ROLE_ROUTES } from '@/lib/roleAccess'

// ── Founder / Super-Admin email — always has full access ─────────────────
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'autonexai.org@gmail.com').toLowerCase()

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

  // ── Secure API routes ──────────────────────────────────────────────────
  if (pathname.startsWith('/api')) {
    const method = request.method
    const isPublicGetInvite = pathname === '/api/portal/invite' && method === 'GET'
    const isPublicAccept = pathname.startsWith('/api/portal/accept')
    
    // Check cron auth for invoice generator
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const isCron = pathname === '/api/retainers/generate-invoices' &&
      (authHeader === `Bearer ${cronSecret}` || !cronSecret || process.env.NODE_ENV === 'development')

    const isPublicApi = isPublicGetInvite || isPublicAccept || isCron

    if (!user && !isPublicApi) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (user && !isPublicApi) {
      const email = user.email?.toLowerCase()
      if (email) {
        // ── Founder bypass — admin has unrestricted API access ──────────────
        if (email === ADMIN_EMAIL) {
          return supabaseResponse
        }

        const { data: member } = await supabase
          .from('team_members')
          .select('status')
          .eq('email', email)
          .maybeSingle()

        // Block inactive users from making API calls
        if (member?.status === 'inactive') {
          return new NextResponse(
            JSON.stringify({ error: 'Deactivated: Your account has been deactivated' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Block deleted users from making API calls (if team has other active members)
        if (!member) {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })

          if (count && count > 0) {
            return new NextResponse(
              JSON.stringify({ error: 'Forbidden: Access denied' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
          }
        }
      }
    }

    return supabaseResponse
  }

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
      // ── Founder bypass — admin always has full page access ──────────────
      if (email === ADMIN_EMAIL) {
        return supabaseResponse
      }

      const { data: member } = await supabase
        .from('team_members')
        .select('status, roles(name)')
        .eq('email', email)
        .maybeSingle()

      // Block inactive team members
      if (member?.status === 'inactive') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'access_denied')
        const res = NextResponse.redirect(url)
        request.cookies.getAll().forEach(cookie => {
          if (cookie.name.includes('supabase') || cookie.name.startsWith('sb-')) {
            res.cookies.delete(cookie.name)
          }
        })
        return res
      }

      // If NO team_members record exists, check if DB is empty or if this is a deleted user
      if (!member) {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })

        if (count && count > 0) {
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          url.searchParams.set('error', 'access_denied')
          const res = NextResponse.redirect(url)
          request.cookies.getAll().forEach(cookie => {
            if (cookie.name.includes('supabase') || cookie.name.startsWith('sb-')) {
              res.cookies.delete(cookie.name)
            }
          })
          return res
        }
        return supabaseResponse
      }

      const roleName: string | null = (member as any)?.roles?.name ?? null

      // If role IS found but doesn't have access → redirect to dashboard
      if (roleName && !canAccess(roleName, pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set('access_denied', '1')
        return NextResponse.redirect(url)
      }

      // If member exists but has no role assigned yet → send to dashboard (safe fallback)
      if (member && !roleName && pathname !== '/dashboard') {
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