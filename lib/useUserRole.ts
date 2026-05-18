'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface UserRole {
  role_name: string | null
  department_name: string | null
  status: string | null
  loading: boolean
  /** true when user has no team_members record (platform admin/founder) */
  isAdmin: boolean
}

// Session-scoped cache (per tab, cleared on new login)
let cachedRole: Omit<UserRole, 'loading'> | null = null
let cachedForEmail: string | null = null

export function useUserRole(): UserRole {
  const [data, setData] = useState<Omit<UserRole, 'loading'>>({
    role_name: null,
    department_name: null,
    status: null,
    isAdmin: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }

      // Return cache if it's for the same user
      if (cachedRole && cachedForEmail === user.email) {
        setData(cachedRole)
        setLoading(false)
        return
      }

      const { data: member, error } = await supabase
        .from('team_members')
        .select('status, roles(name, departments(name))')
        .eq('email', user.email.toLowerCase())
        .single()

      let result: Omit<UserRole, 'loading'>

      if (!member || error?.code === 'PGRST116') {
        // No team_members record → this is the platform admin/founder
        // Give them a "Founder" display but flag as isAdmin
        result = {
          role_name: 'Founder',
          department_name: 'Leadership',
          status: 'active',
          isAdmin: true,
        }
      } else {
        result = {
          role_name: (member as any)?.roles?.name ?? null,
          department_name: (member as any)?.roles?.departments?.name ?? null,
          status: (member as any)?.status ?? null,
          isAdmin: false,
        }
      }

      cachedRole = result
      cachedForEmail = user.email
      setData(result)
      setLoading(false)
    }

    fetchRole()
  }, [])

  return { ...data, loading }
}

// Call this on sign-out to clear cache
export function clearRoleCache() {
  cachedRole = null
  cachedForEmail = null
}
