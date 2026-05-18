// Role-based access control definitions
// Maps role names → allowed routes (prefix match)

export type RoleName =
  | 'Founder'
  | 'Managing Director'
  | 'Head'
  | 'Senior'
  | 'Junior'
  | 'Intern'

// Routes each role can ACCESS (prefix match).
// If a route is not listed, they will be redirected to /dashboard.
export const ROLE_ROUTES: Record<string, string[]> = {
  'Founder': [
    '/dashboard', '/clients', '/documents', '/invoices',
    '/retainers', '/reports', '/activity', '/team',
    '/notifications', '/settings',
  ],
  'Managing Director': [
    '/dashboard', '/clients', '/documents', '/invoices',
    '/retainers', '/reports', '/activity', '/team',
    '/notifications', '/settings',
  ],
  'Head': [
    '/dashboard', '/clients', '/documents', '/invoices',
    '/retainers', '/reports', '/activity', '/notifications',
  ],
  'Senior': [
    '/dashboard', '/clients', '/documents', '/invoices',
    '/retainers', '/reports', '/activity', '/notifications',
  ],
  'Junior': [
    '/dashboard', '/clients', '/documents', '/reports',
    '/activity', '/notifications',
  ],
  'Intern': [
    '/dashboard', '/clients', '/documents', '/reports',
    '/activity', '/notifications',
  ],
}

// Nav label shown in sidebar per role (for display only)
export const ROLE_ACCESS_LABEL: Record<string, string> = {
  'Founder':           'Full Access',
  'Managing Director': 'Full Access',
  'Head':              'Dept. Access',
  'Senior':            'Read + Write',
  'Junior':            'Read + Limited',
  'Intern':            'Read Only',
}

export const ROLE_COLOR: Record<string, string> = {
  'Founder':           'text-violet-400',
  'Managing Director': 'text-blue-400',
  'Head':              'text-emerald-400',
  'Senior':            'text-teal-400',
  'Junior':            'text-amber-400',
  'Intern':            'text-slate-400',
}

// Check if a role can access a given pathname
export function canAccess(roleName: string | null, pathname: string): boolean {
  if (!roleName) return false
  const allowed = ROLE_ROUTES[roleName] ?? []
  return allowed.some(route => pathname === route || pathname.startsWith(route + '/'))
}
