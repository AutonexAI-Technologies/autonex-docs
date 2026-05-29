import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/files?client_id=xxx
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const clientId = new URL(req.url).searchParams.get('client_id')
    const deliverables = new URL(req.url).searchParams.get('deliverables')
    let q = admin.from('files').select('*').order('created_at', { ascending: false })
    if (clientId) q = q.eq('client_id', clientId) as any
    if (deliverables === 'true') q = q.eq('is_deliverable', true) as any
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/files — register a file record (upload to storage is done client-side)
export async function POST(req: NextRequest) {
  try {
    const admin = createAdminSupabaseClient()
    const body = await req.json()
    const { client_id, uploaded_by, uploader_name, uploader_type, file_name, file_size, file_type, storage_path, is_deliverable, description } = body
    if (!client_id || !file_name || !storage_path) {
      return NextResponse.json({ error: 'client_id, file_name, storage_path required' }, { status: 400 })
    }
    const { data, error } = await admin.from('files').insert({
      client_id, uploaded_by, uploader_name: uploader_name || 'Team',
      uploader_type: uploader_type || 'team', file_name, file_size: file_size || 0,
      file_type: file_type || 'application/octet-stream', storage_path,
      is_deliverable: is_deliverable || false, description: description || null,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
