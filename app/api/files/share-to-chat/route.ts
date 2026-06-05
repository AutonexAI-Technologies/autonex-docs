import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabaseServer'

/**
 * POST /api/files/share-to-chat
 * Body: { file_id, client_id }
 * Generates a signed URL for the file and sends it as a message
 * into the client's primary chat thread.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabaseClient()
    const { file_id, client_id } = await req.json()

    if (!file_id || !client_id) {
      return NextResponse.json({ error: 'file_id and client_id required' }, { status: 400 })
    }

    // Get file metadata
    const { data: file } = await admin.from('files').select('*').eq('id', file_id).single()
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    // Get sender info
    const { data: member } = await admin
      .from('team_members')
      .select('name, roles(name)')
      .eq('email', user.email ?? '')
      .maybeSingle()

    const senderName = (member as any)?.name || 'Team'
    const senderRole = (member as any)?.roles?.name || null

    // Generate a signed URL valid for 7 days
    const { data: signedData } = await admin.storage
      .from('files')
      .createSignedUrl(file.storage_path, 60 * 60 * 24 * 7)

    const fileUrl = signedData?.signedUrl || ''
    const fileSizeMB = file.file_size ? `${(file.file_size / 1048576).toFixed(1)} MB` : ''

    // Build message content with file info
    const content = `📎 **${file.file_name}**${fileSizeMB ? ` (${fileSizeMB})` : ''}\n${fileUrl}`

    // Get or create the primary thread for this client
    const { data: threads } = await admin
      .from('chat_threads')
      .select('id')
      .eq('client_id', client_id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (!threads || threads.length === 0) {
      return NextResponse.json({ error: 'No chat thread found for this client' }, { status: 404 })
    }

    const threadId = threads[0].id

    // Send file link as a message
    const { data: msg, error: msgErr } = await admin.from('chat_messages').insert({
      thread_id: threadId,
      client_id,
      sender_id: user.id,
      sender_name: senderName,
      sender_role: senderRole,
      sender_type: 'team',
      content,
      status: 'sent',
    }).select().single()

    if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

    // Update thread last_message
    await admin.from('chat_threads').update({
      last_message: `📎 ${file.file_name}`,
      last_message_at: new Date().toISOString(),
    }).eq('id', threadId)

    return NextResponse.json({ success: true, message: msg, thread_id: threadId })
  } catch (err: any) {
    console.error('[POST /api/files/share-to-chat]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
