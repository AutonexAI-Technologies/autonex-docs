export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabaseServer'

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE /api/notifications/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
