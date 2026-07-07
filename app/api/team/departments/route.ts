export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

export async function GET() {
  const adminSupabase = createAdminSupabaseClient()

  const { data, error } = await adminSupabase
    .from('departments')
    .select('id, name, roles ( id, name )')
    .order('name')

  if (error) {
    if (
      error.message.includes('relation') ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache')
    ) {
      return NextResponse.json([])
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
