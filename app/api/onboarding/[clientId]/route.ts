import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/onboarding/[clientId]
export async function GET(_: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data: tasks, error } = await admin
      .from('onboarding_tasks')
      .select('*, onboarding_checklists(id)')
      .eq('client_id', params.clientId)
      .order('sort_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(tasks ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
