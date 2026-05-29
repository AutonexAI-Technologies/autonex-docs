import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabaseServer'

// GET /api/files/[id]/signed-url — 60-second download link
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = createAdminSupabaseClient()
    const { data: file, error: fileErr } = await admin
      .from('files').select('storage_path, file_name').eq('id', params.id).single()
    if (fileErr || !file) return NextResponse.json({ error: 'File not found' }, { status: 404 })
    const { data, error } = await admin.storage.from('files').createSignedUrl(file.storage_path, 60)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url: data.signedUrl, file_name: file.file_name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
