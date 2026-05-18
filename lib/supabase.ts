import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  // Guard: don't crash when env vars are placeholders/missing
  if (!url.startsWith('http')) {
    // Return a no-op stub so UI renders without auth
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({
          data: null,
          error: { message: 'Supabase not configured. Set your .env.local values.' },
        }),
        signOut: async () => ({}),
      },
    } as any
  }

  return createBrowserClient(url, key)
}