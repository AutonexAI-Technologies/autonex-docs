import { createServerSupabaseClient } from '@/lib/supabaseServer'

interface LogParams {
  user_name?: string
  action: string
  entity_type: 'client' | 'invoice' | 'document' | 'retainer' | 'team' | 'settings' | 'system'
  entity_id?: string
  entity_name?: string
  metadata?: Record<string, any>
}

interface NotifyParams {
  title: string
  message: string
  type?: 'success' | 'warning' | 'error' | 'info'
  link?: string
}

/**
 * Log an activity entry to the activity_logs table.
 * Silently skips if the table doesn't exist yet.
 */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.from('activity_logs').insert([{
      user_name: params.user_name || 'System',
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      entity_name: params.entity_name || null,
      metadata: params.metadata || null,
    }])
  } catch {
    // Silently skip — never block the main action
  }
}

/**
 * Create a notification in the notifications table.
 * Silently skips if the table doesn't exist yet.
 */
export async function createNotification(params: NotifyParams): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.from('notifications').insert([{
      title: params.title,
      message: params.message,
      type: params.type || 'info',
      link: params.link || null,
      read: false,
    }])
  } catch {
    // Silently skip
  }
}

/**
 * Log activity + create a notification in one call.
 */
export async function logAndNotify(
  log: LogParams,
  notification: NotifyParams
): Promise<void> {
  await Promise.allSettled([
    logActivity(log),
    createNotification(notification),
  ])
}
