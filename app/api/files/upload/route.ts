export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/files/upload
 * Accepts multipart form data: file, client_id, uploader_name, uploader_type, is_deliverable
 * Uploads to Supabase Storage using admin client (bypasses RLS) and inserts DB record.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabaseClient()
    const form = await req.formData()

    const file = form.get('file') as File | null
    const clientId = form.get('client_id') as string
    const uploaderName = (form.get('uploader_name') as string) || 'Team'
    const uploaderType = (form.get('uploader_type') as string) || 'team'
    const isDeliverable = form.get('is_deliverable') === 'true'
    const description = (form.get('description') as string) || null

    if (!file || !clientId) {
      return NextResponse.json({ error: 'file and client_id required' }, { status: 400 })
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `clients/${clientId}/${Date.now()}-${safeName}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to storage using admin client — bypasses RLS
    const { error: storageErr } = await admin.storage
      .from('files')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (storageErr) {
      console.error('[upload] storage error:', storageErr)
      return NextResponse.json({ error: storageErr.message }, { status: 500 })
    }

    // Insert DB record using admin client
    const { data, error: dbErr } = await admin.from('files').insert({
      client_id: clientId,
      uploaded_by: user.id,
      uploader_name: uploaderName,
      uploader_type: uploaderType,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'application/octet-stream',
      storage_path: path,
      is_deliverable: isDeliverable,
      description,
    }).select().single()

    if (dbErr) {
      // Clean up storage if DB insert fails
      await admin.storage.from('files').remove([path])
      return NextResponse.json({ error: dbErr.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/files/upload]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
