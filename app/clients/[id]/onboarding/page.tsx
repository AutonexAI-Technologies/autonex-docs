'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ClipboardList, CheckCircle2, Circle, Upload, MessageSquare,
  ExternalLink, Lock, Loader2, RotateCcw
} from 'lucide-react'

interface OnboardingTask {
  id: string
  title: string
  description: string | null
  action_type: 'upload' | 'message' | 'external' | 'none'
  action_url: string | null
  is_blocking: boolean
  status: 'pending' | 'completed' | 'skipped'
  completed_at: string | null
  sort_order: number
}

const ACTION_ICON = {
  upload:   Upload,
  message:  MessageSquare,
  external: ExternalLink,
  none:     Circle,
}

export default function OnboardingPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('onboarding_tasks')
      .select('*')
      .eq('client_id', id)
      .order('sort_order', { ascending: true })
    setTasks((data as OnboardingTask[]) ?? [])
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { load() }, [load])

  const toggle = async (task: OnboardingTask) => {
    setToggling(task.id)
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await supabase.from('onboarding_tasks').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', task.id)
    setTasks(prev => prev.map(t =>
      t.id === task.id
        ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
        : t
    ))
    setToggling(null)
  }

  const initChecklist = async () => {
    setLoading(true)
    await supabase.rpc('create_default_onboarding', { p_client_id: id })
    load()
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <ClipboardList className="w-12 h-12 text-slate-700" />
        <p className="text-slate-500 text-sm">No onboarding checklist created yet</p>
        <button
          onClick={initChecklist}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          Create Default Checklist
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            Onboarding Progress
          </h2>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{progress}%</p>
            <p className="text-[10px] text-slate-500">{completedCount}/{tasks.length} done</p>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        {progress === 100 && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Onboarding complete! Client is fully set up.
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, i) => {
          const AIcon = ACTION_ICON[task.action_type]
          const isComplete = task.status === 'completed'
          const isBlocked = task.is_blocking && !isComplete

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`group flex items-start gap-3 p-4 rounded-xl border transition-all ${
                isComplete
                  ? 'bg-emerald-500/5 border-emerald-500/15'
                  : 'bg-white border-slate-200 hover:border-slate-200'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => toggle(task)}
                disabled={toggling === task.id}
                className="mt-0.5 shrink-0"
              >
                {toggling === task.id ? (
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 hover:text-blue-400 transition-colors" />
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${isComplete ? 'text-slate-500 line-through' : 'text-white'}`}>
                    {task.title}
                  </p>
                  {task.is_blocking && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" />Blocking
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className={`text-xs mt-1 ${isComplete ? 'text-slate-600' : 'text-slate-500'}`}>
                    {task.description}
                  </p>
                )}
                {task.completed_at && (
                  <p className="text-[10px] text-emerald-500 mt-1.5">
                    Completed {new Date(task.completed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {/* Action type icon */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isComplete ? 'bg-emerald-500/10' : 'bg-slate-50'
              }`}>
                <AIcon className={`w-3.5 h-3.5 ${isComplete ? 'text-emerald-400' : 'text-slate-500'}`} />
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Reset */}
      <div className="flex justify-center pt-2">
        <button
          onClick={async () => {
            await supabase.from('onboarding_tasks').update({ status: 'pending', completed_at: null }).eq('client_id', id)
            load()
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset all
        </button>
      </div>
    </div>
  )
}
