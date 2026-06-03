import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/clients/assignments/count?team_id=xxx
export async function GET(req: NextRequest) {
  const admin = createAdminSupabaseClient()
  const teamId = new URL(req.url).searchParams.get('team_id')
  if (!teamId) return NextResponse.json({ count: 0 })
  const { count, error } = await admin
    .from('client_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
  if (error) return NextResponse.json({ count: 0 })
  return NextResponse.json({ count: count ?? 0 })
}
