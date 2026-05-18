// ─── Client ─────────────────────────────────────────────────────────────────
export type ClientStatus = 'Lead' | 'Active' | 'Completed' | 'On Hold' | 'Cancelled'
export type ProjectType = 'one-time' | 'retainer'

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  service: string
  total_fee: number
  deposit_fee: number
  start_date?: string
  bank_name?: string
  account_number?: string
  ifsc_code?: string
  upi_id?: string
  invoice_number?: string
  status: ClientStatus
  project_type: ProjectType
  notes?: string
  deleted_at?: string | null
  created_at: string
  updated_at?: string
}

export interface ClientNote {
  id: string
  client_id: string
  content: string
  created_by: string
  created_at: string
}

// ─── Services ────────────────────────────────────────────────────────────────
export interface ServiceType {
  id: string
  emoji: string
  name: string
  description: string
  default_setup_fee: number
  default_retainer_fee: number
  is_custom: boolean
}

export const DEFAULT_SERVICES: ServiceType[] = [
  { id: 'web-dev', emoji: '🌐', name: 'Web Development', description: 'Custom websites and web applications', default_setup_fee: 25000, default_retainer_fee: 8000, is_custom: false },
  { id: 'ai-sales', emoji: '💬', name: 'AI Sales & Support Agents', description: 'Intelligent chatbots for sales and support', default_setup_fee: 35000, default_retainer_fee: 20000, is_custom: false },
  { id: 'ai-lead', emoji: '🎯', name: 'AI Lead Generation & Outreach', description: 'Automated lead gen and outreach systems', default_setup_fee: 22000, default_retainer_fee: 15000, is_custom: false },
  { id: 'ai-content', emoji: '✍️', name: 'AI Content Systems', description: 'AI-powered content creation pipelines', default_setup_fee: 20000, default_retainer_fee: 12000, is_custom: false },
  { id: 'crm-ops', emoji: '⚙️', name: 'CRM & Operations Automation', description: 'CRM setup, automation and workflows', default_setup_fee: 30000, default_retainer_fee: 10000, is_custom: false },
  { id: 'ai-voice', emoji: '📞', name: 'AI Voice Agents & Phone Automation', description: 'AI-powered voice and phone systems', default_setup_fee: 40000, default_retainer_fee: 18000, is_custom: false },
  { id: 'ai-reporting', emoji: '📊', name: 'AI Reporting & Business Intelligence', description: 'Automated reporting and data insights', default_setup_fee: 25000, default_retainer_fee: 10000, is_custom: false },
  { id: 'doc-processing', emoji: '📄', name: 'Document Processing & Workflow AI', description: 'Document automation and AI workflows', default_setup_fee: 22000, default_retainer_fee: 10000, is_custom: false },
  { id: 'custom', emoji: '🛠️', name: 'Custom Package', description: 'Custom solution tailored to your needs', default_setup_fee: 0, default_retainer_fee: 0, is_custom: true },
]

export const SERVICE_NAMES = DEFAULT_SERVICES.map(s => s.name)

// Legacy export for backward compat
export const SERVICE_TYPES = SERVICE_NAMES

// ─── Documents ───────────────────────────────────────────────────────────────
export type DocumentId = 'contract' | 'welcome' | 'invoice' | 'thankyou'
export type DocumentStatus = 'pending' | 'generated' | 'sent' | 'delivered' | 'opened'

export interface DocumentMeta {
  id: DocumentId
  title: string
  description: string
  icon: string
}

export interface DocumentRecord {
  id: string
  client_id: string
  type: DocumentId
  status: DocumentStatus
  file_url?: string
  sent_at?: string
  generated_at?: string
  created_at: string
}

export const DOCUMENTS: DocumentMeta[] = [
  { id: 'contract', title: 'Client Contract', description: 'Professional service agreement under Indian law', icon: '📄' },
  { id: 'welcome', title: 'Welcome Message', description: 'Official onboarding communication to the client', icon: '👋' },
  { id: 'invoice', title: 'Invoice', description: '50% deposit invoice with payment details', icon: '🧾' },
  { id: 'thankyou', title: 'Thank You & Offboarding', description: 'Project completion and future engagement', icon: '🙏' },
]

// ─── Invoices ─────────────────────────────────────────────────────────────────
export type PaymentStatus = 'Pending' | 'Paid' | 'Overdue' | 'Cancelled'
export type PaymentMethod = 'UPI' | 'Bank Transfer' | 'Cash' | 'Razorpay' | 'Stripe'

export interface LineItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string
  client_name?: string
  client_email?: string
  line_items: LineItem[]
  subtotal: number
  gst_enabled: boolean
  gst_amount: number
  total: number
  deposit_amount: number
  status: PaymentStatus
  due_date?: string
  paid_at?: string
  payment_method?: PaymentMethod
  notes?: string
  is_retainer_invoice: boolean
  retainer_period?: string
  created_at: string
}

// ─── Retainers ─────────────────────────────────────────────────────────────────
export type RetainerStatus = 'Active' | 'Paused' | 'Cancelled'
export type BillingCycle = 'monthly' | 'quarterly'

export interface Retainer {
  id: string
  client_id: string
  client_name?: string
  amount: number
  status: RetainerStatus
  billing_cycle: BillingCycle
  start_date: string
  next_billing_date: string
  total_billed: number
  created_at: string
}

// ─── Team ────────────────────────────────────────────────────────────────────
export interface Department {
  id: string
  name: string
  archived: boolean
  created_at: string
}

export interface Permission {
  dashboard_view: boolean
  clients_view: boolean
  clients_add: boolean
  clients_edit: boolean
  clients_delete: boolean
  documents_view: boolean
  documents_generate: boolean
  documents_send: boolean
  documents_download: boolean
  invoices_view: boolean
  invoices_create: boolean
  invoices_edit: boolean
  invoices_delete: boolean
  team_view: boolean
  team_invite: boolean
  team_edit_roles: boolean
  team_remove: boolean
  settings_view: boolean
  settings_edit: boolean
  reports_view: boolean
  reports_export: boolean
  activity_logs_view: boolean
  retainer_view: boolean
  retainer_create: boolean
  retainer_edit: boolean
}

export interface Role {
  id: string
  name: string
  department_id: string
  department_name?: string
  permissions: Permission
  created_at: string
}

export interface TeamMember {
  id: string
  user_id?: string
  name: string
  email: string
  role_id: string
  role_name?: string
  department_id: string
  department_name?: string
  status: 'active' | 'invited' | 'inactive'
  joined_at?: string
  created_at: string
}

// ─── Activity Log ──────────────────────────────────────────────────────────
export interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  action: string
  entity_type: string
  entity_id?: string
  entity_name?: string
  metadata?: Record<string, any>
  created_at: string
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  link?: string
  created_at: string
}

// ─── Settings ────────────────────────────────────────────────────────────────
export interface CompanySettings {
  company_name: string
  tagline?: string
  website?: string
  logo_url?: string
  registered_address?: string
  gst_number?: string
  pan_number?: string
  bank_name?: string
  account_number?: string
  ifsc_code?: string
  upi_id?: string
  email_from_name?: string
  email_reply_to?: string
  email_signature?: string
}

// ─── Reports ────────────────────────────────────────────────────────────────
export interface RevenueData {
  month: string
  one_time: number
  retainer: number
  total: number
}

export interface ServiceBreakdown {
  service: string
  revenue: number
  count: number
}

// ─── API Response ────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}