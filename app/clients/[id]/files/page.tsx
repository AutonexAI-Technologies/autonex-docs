'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { useUserRole } from '@/lib/useUserRole'
import {
  FolderOpen, Upload, Download, Trash2, FileText,
  Image, File, Film, Music, Archive, CheckCircle2,
  Clock, AlertCircle, Loader2, Link2, MessageSquare,
  RefreshCw, User, Users
} from 'lucide-react'

interface FileItem {
  id: string
  file_name: string
  file_size: number
  file_type: string
  uploader_name: string
  uploader_type: 'team' | 'client'
  is_deliverable: boolean
  approval_status: 'pending' | 'approved' | 'changes_requested' | null
  description: string | null
  storage_path: string
  created_at: string
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type.startsWith('video/')) return Film
  if (type.startsWith('audio/')) return Music
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return Archive
  return File
}

function formatSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const APPROVAL_CONFIG = {
  pending:           { label: 'Pending Review', icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 border border-amber-200' },
  approved:          { label: 'Approved',       icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-200' },
  changes_requested: { label: 'Changes Needed', icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50 border border-red-200' },
}

// Roles that can delete files
const CAN_DELETE_ROLES = ['Founder', 'Managing Director', 'Head', 'Senior']
// Roles that can upload files
const CAN_UPLOAD_ROLES = ['Founder', 'Managing Director', 'Head', 'Senior', 'Junior']
// Roles that can mark deliverables / set approval
const CAN_MANAGE_ROLES = ['Founder', 'Managing Director', 'Head', 'Senior']

export default function FilesPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const { toast } = useToast()
  const { role_name, isAdmin, loading: roleLoading } = useUserRole()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'deliverable' | 'team' | 'client'>('all')
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const effectiveRole = isAdmin ? 'Founder' : (role_name ?? '')
  const canDelete = CAN_DELETE_ROLES.includes(effectiveRole)
  const canUpload = CAN_UPLOAD_ROLES.includes(effectiveRole)
  const canManage = CAN_MANAGE_ROLES.includes(effectiveRole)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/files?client_id=${id}`)
      const data = await res.json()
      setFiles(Array.isArray(data) ? data : [])
    } catch {
      toast({ variant: 'destructive', title: 'Failed to load files' })
    } finally {
      setLoading(false)
    }
  }, [id]) // eslint-disable-line

  useEffect(() => {
    load()
    // Poll every 8s to catch client uploads in real-time
    pollRef.current = setInterval(load, 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [load])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList?.length) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    let uploaderName = 'Team'
    const { data: m } = await supabase.from('team_members').select('name').eq('email', user?.email ?? '').maybeSingle()
    if (m) uploaderName = (m as any).name

    let successCount = 0
    const fileArr = Array.from(fileList)

    for (const file of fileArr) {
      setUploadProgress(`Uploading ${file.name}…`)
      const form = new FormData()
      form.append('file', file)
      form.append('client_id', id)
      form.append('uploader_name', uploaderName)
      form.append('uploader_type', 'team')
      form.append('is_deliverable', 'false')

      const res = await fetch('/api/files/upload', { method: 'POST', body: form })
      if (res.ok) {
        successCount++
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ variant: 'destructive', title: `Failed to upload ${file.name}`, description: err.error || 'Upload failed' })
      }
    }

    setUploading(false)
    setUploadProgress('')
    e.target.value = ''
    if (successCount > 0) {
      toast({ title: `✅ ${successCount} file${successCount > 1 ? 's' : ''} uploaded!` })
      load()
    }
  }

  const shareToChat = async (f: FileItem) => {
    setSharingId(f.id)
    const res = await fetch('/api/files/share-to-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: f.id, client_id: id }),
    })
    setSharingId(null)
    if (res.ok) {
      toast({ title: '💬 File shared to group chat!' })
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ variant: 'destructive', title: 'Share failed', description: err.error })
    }
  }

  const setApproval = async (fileId: string, status: string) => {
    await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_status: status, is_deliverable: true }),
    })
    load()
  }

  const markDeliverable = async (fileId: string, v: boolean) => {
    await fetch(`/api/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_deliverable: v, approval_status: v ? 'pending' : null }),
    })
    load()
  }

  const deleteFile = async (f: FileItem) => {
    if (!confirm(`Delete "${f.file_name}"? This cannot be undone.`)) return
    setDeletingId(f.id)
    const res = await fetch(`/api/files/${f.id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) {
      toast({ title: '🗑️ File deleted' })
      setFiles(prev => prev.filter(x => x.id !== f.id))
    } else {
      const err = await res.json().catch(() => ({}))
      toast({ variant: 'destructive', title: 'Delete failed', description: err.error })
    }
  }

  const download = async (f: FileItem) => {
    const res = await fetch(`/api/files/${f.id}?expires=60`)
    const d = await res.json()
    if (d.url) window.open(d.url, '_blank')
    else toast({ variant: 'destructive', title: 'Could not generate download link' })
  }

  const copyLink = async (f: FileItem) => {
    const res = await fetch(`/api/files/${f.id}?expires=3600`)
    const d = await res.json()
    if (d.url) {
      await navigator.clipboard.writeText(d.url)
      toast({ title: '🔗 Link copied! Valid for 1 hour.' })
    }
  }

  const filtered = files.filter(f => {
    if (filter === 'deliverable') return f.is_deliverable
    if (filter === 'team') return f.uploader_type === 'team'
    if (filter === 'client') return f.uploader_type === 'client'
    return true
  })

  const clientUploads = files.filter(f => f.uploader_type === 'client')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-blue-600" />
            Files
            <span className="text-xs text-slate-400 font-normal">({files.length})</span>
          </h2>
          {/* Client upload badge */}
          {clientUploads.length > 0 && (
            <button onClick={() => setFilter('client')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-semibold hover:bg-violet-100 transition-colors">
              <User className="w-2.5 h-2.5" />
              {clientUploads.length} from client
            </button>
          )}
        </div>
        {canUpload && (
          <label className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all shadow-sm ${uploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
            {uploading ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> {uploadProgress || 'Uploading…'}</>
            ) : (
              <><Upload className="w-3 h-3" /> Upload Files</>
            )}
            <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {([
          ['all', 'All Files', null],
          ['team', 'Team Uploads', Users],
          ['client', 'Client Uploads', User],
          ['deliverable', 'Deliverables', CheckCircle2],
        ] as const).map(([key, label, Icon]: any) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filter === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {label}
            {key === 'client' && clientUploads.length > 0 && (
              <span className={`ml-0.5 px-1 py-0.5 rounded text-[9px] font-bold ${filter === 'client' ? 'bg-white/20' : 'bg-violet-100 text-violet-700'}`}>
                {clientUploads.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty / loading state */}
      {!loading && filtered.length === 0 ? (
        canUpload ? (
          <label className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-colors">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-semibold text-sm">Drop files here or click to upload</p>
              <p className="text-slate-400 text-xs mt-1">Any file type · Max 50MB per file</p>
            </div>
            <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <FolderOpen className="w-10 h-10 text-slate-300" />
            <p className="text-slate-500 text-sm">No files yet</p>
          </div>
        )
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((f, i) => {
              const FIcon = fileIcon(f.file_type)
              const approvalConf = f.approval_status ? APPROVAL_CONFIG[f.approval_status] : null
              const ApprovalIcon = approvalConf?.icon
              const isClientUpload = f.uploader_type === 'client'
              const isDeleting = deletingId === f.id
              const isSharing = sharingId === f.id

              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: i * 0.03 }}
                  className={`group flex items-center gap-3 p-3 bg-white border rounded-xl hover:shadow-sm transition-all ${
                    isClientUpload ? 'border-violet-200 hover:border-violet-300' : 'border-slate-200 hover:border-blue-200'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    isClientUpload ? 'bg-violet-50 border-violet-100' : 'bg-blue-50 border-blue-100'
                  }`}>
                    <FIcon className={`w-4 h-4 ${isClientUpload ? 'text-violet-600' : 'text-blue-600'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 truncate">{f.file_name}</p>
                      {isClientUpload && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-bold shrink-0">
                          <User className="w-2.5 h-2.5" /> Client
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      {f.file_size > 0 && <span>{formatSize(f.file_size)}</span>}
                      <span>·</span>
                      <span>{f.uploader_name}</span>
                      <span>·</span>
                      <span>{new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Approval badge */}
                  {approvalConf && ApprovalIcon && (
                    <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${approvalConf.bg} ${approvalConf.color} shrink-0`}>
                      <ApprovalIcon className="w-3 h-3" />
                      {approvalConf.label}
                    </div>
                  )}

                  {/* Deliverable toggle (managers only) */}
                  {canManage && (
                    <button
                      onClick={() => markDeliverable(f.id, !f.is_deliverable)}
                      title={f.is_deliverable ? 'Remove deliverable mark' : 'Mark as deliverable'}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${f.is_deliverable ? 'text-blue-600 bg-blue-50' : 'text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100'}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Approval buttons (managers only, on hover for deliverables) */}
                  {canManage && f.is_deliverable && (
                    <div className="hidden sm:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(['pending', 'approved', 'changes_requested'] as const).map(s => {
                        const ac = APPROVAL_CONFIG[s]
                        const AIcon = ac.icon
                        return (
                          <button key={s} onClick={() => setApproval(f.id, s)} title={ac.label}
                            className={`p-1.5 rounded-lg transition-all ${f.approval_status === s ? `${ac.bg} ${ac.color}` : 'text-slate-300 hover:text-slate-600'}`}>
                            <AIcon className="w-3 h-3" />
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Share to chat */}
                    <button onClick={() => shareToChat(f)} disabled={isSharing} title="Share to group chat"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50">
                      {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                    </button>

                    {/* Copy link */}
                    <button onClick={() => copyLink(f)} title="Copy shareable link"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Link2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Download */}
                    <button onClick={() => download(f)} title="Download"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete (role-gated) */}
                    {canDelete && (
                      <button onClick={() => deleteFile(f)} disabled={isDeleting} title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
