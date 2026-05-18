'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export interface UserRole {
  role_name: string | null
  department_name: string | null
  status: string | null
  loading: boolean
}

// Session-scoped cache (per tab, cleared on new login)
let cachedRole: Omit<UserRole, 'loading'> | null = null
let cachedForEmail: string | null = null

export function useUserRole(): UserRole {
  const [data, setData] = useState<Omit<UserRole, 'loading'>>({
    role_name: null,
    department_name: null,
    status: null,
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

      const { data: member } = await supabase
        .from('team_members')
        .select('status, roles(name, departments(name))')
        .eq('email', user.email.toLowerCase())
        .single()

      const result = {
        role_name: (member as any)?.roles?.name ?? null,
        department_name: (member as any)?.roles?.departments?.name ?? null,
        status: (member as any)?.status ?? null,
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
