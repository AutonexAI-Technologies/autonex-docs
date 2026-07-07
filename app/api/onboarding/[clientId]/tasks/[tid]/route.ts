export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// PATCH /api/onboarding/[clientId]/tasks/[tid]
export async function PATCH(req: NextRequest, { params }: { params: { clientId: string; tid: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const body = await req.json()
    const update: Record<string, any> = { ...body }
    if (body.status === 'completed') update.completed_at = new Date().toISOString()
    if (body.status === 'pending') update.completed_at = null
    const { data, error } = await admin.from('onboarding_tasks').update(update).eq('id', params.tid).eq('client_id', params.clientId).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
