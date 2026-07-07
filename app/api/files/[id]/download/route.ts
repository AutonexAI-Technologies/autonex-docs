export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

/**
 * GET /api/files/[id]/download
 * Proxies the file — Supabase URL never exposed to the browser.
 * Forces a browser download with correct filename.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabaseClient()
    const { data: file, error: fetchErr } = await admin
      .from('files')
      .select('storage_path, file_name, file_type')
      .eq('id', params.id)
      .single()

    if (fetchErr || !file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const { data: signed, error: signErr } = await admin.storage
      .from('files')
      .createSignedUrl(file.storage_path, 10)

    if (signErr || !signed?.signedUrl) return NextResponse.json({ error: 'Could not generate link' }, { status: 500 })

    const fileRes = await fetch(signed.signedUrl)
    if (!fileRes.ok) return NextResponse.json({ error: 'Storage fetch failed' }, { status: 502 })

    const safeFilename = encodeURIComponent(file.file_name)
    return new NextResponse(fileRes.body, {
      status: 200,
      headers: {
        'Content-Type': file.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.file_name}"; filename*=UTF-8''${safeFilename}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('[GET /api/files/[id]/download]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
