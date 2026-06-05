import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

// DELETE /api/files/[id] — remove from storage + DB
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabaseClient()

    // Get the file record first to get storage_path
    const { data: file, error: fetchErr } = await admin
      .from('files')
      .select('storage_path, file_name')
      .eq('id', params.id)
      .single()

    if (fetchErr || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Remove from storage
    const { error: storageErr } = await admin.storage
      .from('files')
      .remove([file.storage_path])

    if (storageErr) {
      console.error('[delete] storage error:', storageErr)
      // Continue to delete DB record even if storage fails
    }

    // Delete DB record
    const { error: dbErr } = await admin
      .from('files')
      .delete()
      .eq('id', params.id)

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

    return NextResponse.json({ success: true, file_name: file.file_name })
  } catch (err: any) {
    console.error('[DELETE /api/files/[id]]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/files/[id] — update deliverable/approval status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabaseClient()
    const body = await req.json()

    const { data, error } = await admin
      .from('files')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/files/[id] — get signed download URL
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabaseClient()
    const { data: file } = await admin.from('files').select('storage_path, file_name').eq('id', params.id).single()
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    const expiresIn = Number(new URL(req.url).searchParams.get('expires') || 3600)
    const { data: url, error } = await admin.storage.from('files').createSignedUrl(file.storage_path, expiresIn)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ url: url.signedUrl, file_name: file.file_name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
