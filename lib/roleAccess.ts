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
    '/retainers', '/reports', '/activity', '/team',
    '/notifications', '/settings',
  ],
  'Senior': [
    '/dashboard', '/clients', '/documents', '/invoices',
    '/retainers', '/reports', '/activity', '/team',
    '/notifications',
  ],
  'Junior': [
    '/dashboard', '/clients', '/documents', '/reports',
    '/activity', '/team', '/notifications',
  ],
  'Intern': [
    '/dashboard', '/clients', '/documents', '/reports',
    '/activity', '/team', '/notifications',
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

// What actions a role can perform
export const ROLE_PERMISSIONS: Record<string, {
  canCreateClient: boolean
  canEditClient: boolean
  canDeleteClient: boolean
  canCreateInvoice: boolean
  canManageTeam: boolean
  canViewReports: boolean
  canViewRevenue: boolean
  canManageSettings: boolean
}> = {
  'Founder': {
    canCreateClient: true, canEditClient: true, canDeleteClient: true,
    canCreateInvoice: true, canManageTeam: true, canViewReports: true,
    canViewRevenue: true, canManageSettings: true,
  },
  'Managing Director': {
    canCreateClient: true, canEditClient: true, canDeleteClient: true,
    canCreateInvoice: true, canManageTeam: true, canViewReports: true,
    canViewRevenue: true, canManageSettings: true,
  },
  'Head': {
    canCreateClient: true, canEditClient: true, canDeleteClient: false,
    canCreateInvoice: true, canManageTeam: false, canViewReports: true,
    canViewRevenue: true, canManageSettings: false,
  },
  'Senior': {
    canCreateClient: true, canEditClient: true, canDeleteClient: false,
    canCreateInvoice: true, canManageTeam: false, canViewReports: true,
    canViewRevenue: true, canManageSettings: false,
  },
  'Junior': {
    canCreateClient: false, canEditClient: false, canDeleteClient: false,
    canCreateInvoice: false, canManageTeam: false, canViewReports: true,
    canViewRevenue: true, canManageSettings: false,
  },
  'Intern': {
    canCreateClient: false, canEditClient: false, canDeleteClient: false,
    canCreateInvoice: false, canManageTeam: false, canViewReports: true,
    canViewRevenue: true, canManageSettings: false,
  },
}

export function getPermissions(roleName: string | null) {
  if (!roleName) {
    // Platform admin / no role → full access
    return ROLE_PERMISSIONS['Founder']
  }
  return ROLE_PERMISSIONS[roleName] ?? ROLE_PERMISSIONS['Intern']
}
