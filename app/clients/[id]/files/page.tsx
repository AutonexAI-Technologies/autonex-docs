'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import {
  FolderOpen, Upload, Download, Trash2, FileText,
  Image, File, Film, Music, Archive, CheckCircle2,
  Clock, AlertCircle, Loader2, Link2
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
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const APPROVAL_CONFIG = {
  pending:           { label: 'Pending Review', icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 border border-amber-200' },
  approved:          { label: 'Approved',       icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-200' },
  changes_requested: { label: 'Changes Needed', icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50 border border-red-200' },
}

export default function FilesPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const { toast } = useToast()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'deliverable' | 'uploaded'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to load files', description: error.message })
    }
    setFiles((data as FileItem[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => {
    load()
    const ch = supabase.channel('files-' + id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `client_id=eq.${id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, supabase, id])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList?.length) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    let uploaderName = 'Team'
    const { data: m } = await supabase.from('team_members').select('name').eq('email', user?.email ?? '').single()
    if (m) uploaderName = (m as any).name

    let successCount = 0
    let failCount = 0
    const fileArr = Array.from(fileList)

    for (const file of fileArr) {
      setUploadProgress(`Uploading ${file.name}…`)
      // Sanitize file name — replace spaces and special chars
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `clients/${id}/${Date.now()}-${safeName}`

      // 1. Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from('files')
        .upload(path, file, { upsert: false })

      if (uploadErr) {
        console.error('Storage upload error:', uploadErr)
        // Try with upsert:true as fallback
        const { error: uploadErr2 } = await supabase.storage
          .from('files')
          .upload(path, file, { upsert: true })

        if (uploadErr2) {
          failCount++
          toast({
            variant: 'destructive',
            title: `Failed to upload ${file.name}`,
            description: uploadErr2.message,
          })
          continue
        }
      }

      // 2. Register record in DB via API (bypasses RLS)
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: id,
          uploaded_by: user?.id,
          uploader_name: uploaderName,
          uploader_type: 'team',
          file_name: file.name,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          storage_path: path,
          is_deliverable: false,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('DB insert error:', err)
        failCount++
        toast({
          variant: 'destructive',
          title: `Failed to save ${file.name}`,
          description: err.error || 'Database error',
        })
      } else {
        successCount++
      }
    }

    setUploading(false)
    setUploadProgress('')
    e.target.value = ''

    if (successCount > 0) {
      toast({ title: `✅ ${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!` })
    }
    if (failCount === 0) load()
  }

  const setApproval = async (fileId: string, status: string) => {
    await supabase.from('files').update({ approval_status: status, is_deliverable: true }).eq('id', fileId)
    load()
  }

  const markDeliverable = async (fileId: string, v: boolean) => {
    await supabase.from('files').update({ is_deliverable: v, approval_status: v ? 'pending' : null }).eq('id', fileId)
    load()
  }

  const deleteFile = async (f: FileItem) => {
    if (!confirm(`Delete "${f.file_name}"? This cannot be undone.`)) return
    await supabase.storage.from('files').remove([f.storage_path])
    await supabase.from('files').delete().eq('id', f.id)
    toast({ title: '🗑️ File deleted' })
    load()
  }

  const download = async (f: FileItem) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(f.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast({ variant: 'destructive', title: 'Could not generate download link' })
  }

  const copyLink = async (f: FileItem) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(f.storage_path, 3600)
    if (data?.signedUrl) {
      await navigator.clipboard.writeText(data.signedUrl)
      toast({ title: '🔗 Link copied! Valid for 1 hour.' })
    }
  }

  const filtered = files.filter(f => {
    if (filter === 'deliverable') return f.is_deliverable
    if (filter === 'uploaded') return f.uploader_type === 'client'
    return true
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-blue-600" />
          Files
          <span className="text-xs text-slate-400 font-normal">({files.length})</span>
        </h2>
        <label className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer transition-all shadow-sm ${uploading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
          {uploading ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> {uploadProgress || 'Uploading…'}</>
          ) : (
            <><Upload className="w-3 h-3" /> Upload Files</>
          )}
          <input type="file" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5">
        {([['all', 'All Files'], ['deliverable', 'Deliverables'], ['uploaded', 'Client Uploads']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filter === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Drag-and-drop zone when empty */}
      {!loading && filtered.length === 0 ? (
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
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f, i) => {
            const FIcon = fileIcon(f.file_type)
            const approvalConf = f.approval_status ? APPROVAL_CONFIG[f.approval_status] : null
            const ApprovalIcon = approvalConf?.icon

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <FIcon className="w-4 h-4 text-blue-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{f.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span>{formatSize(f.file_size)}</span>
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

                {/* Deliverable toggle */}
                <button
                  onClick={() => markDeliverable(f.id, !f.is_deliverable)}
                  title={f.is_deliverable ? 'Mark as not deliverable' : 'Mark as deliverable'}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${f.is_deliverable ? 'text-blue-600 bg-blue-50' : 'text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100'}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>

                {/* Approval buttons (visible on hover for deliverables) */}
                {f.is_deliverable && (
                  <div className="hidden sm:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(['pending', 'approved', 'changes_requested'] as const).map(s => {
                      const ac = APPROVAL_CONFIG[s]
                      const AIcon = ac.icon
                      return (
                        <button
                          key={s}
                          onClick={() => setApproval(f.id, s)}
                          title={ac.label}
                          className={`p-1.5 rounded-lg transition-all ${f.approval_status === s ? `${ac.bg} ${ac.color}` : 'text-slate-300 hover:text-slate-600'}`}
                        >
                          <AIcon className="w-3 h-3" />
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyLink(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Copy shareable link"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => download(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteFile(f)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
