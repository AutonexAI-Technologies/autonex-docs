import { z } from 'zod'

// ─── Helpers ────────────────────────────────────────────
/** Strip spaces, dashes, parens from phone before validation */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '')
}

/** Strip spaces/dashes from account number */
export function normalizeAccountNumber(raw: string): string {
  return raw.replace(/[\s\-]/g, '')
}

// ─── Step 1 — Client Info ───────────────────────────────
export const step1Schema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and dots'),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .transform(v => v.trim().toLowerCase()),

  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(
      z.string().refine(
        (val) => val === '' || /^\+[1-9]\d{6,14}$/.test(val),
        'Enter a valid international phone number (e.g. +91 9876543210)'
      )
    ),

  company: z
    .string()
    .max(100, 'Company name must be under 100 characters')
    .optional()
    .or(z.literal('')),

  status: z.string().default('Lead'),
  notes: z.string().optional().or(z.literal('')),
})

// ─── Step 2 — Project Details ───────────────────────────
export const step2Schema = z.object({
  service: z.string().min(1, 'Please select a service type'),
  total_fee: z
    .string()
    .min(1, 'Total fee is required')
    .refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Fee must be greater than 0'),
  start_date: z.string().optional().or(z.literal('')),
  project_type: z.enum(['one-time', 'retainer']),
})

// ─── Step 3 — Payment Details (all optional, but validated if filled) ──
export const step3Schema = z.object({
  bank_name: z
    .string()
    .refine(
      (val) => val === '' || (val.length >= 2 && val.length <= 100 && /^[a-zA-Z0-9\s.\-&']+$/.test(val)),
      'Bank name must be 2–100 characters (letters, numbers, spaces, dots, hyphens)'
    )
    .optional()
    .or(z.literal('')),

  account_number: z
    .string()
    .transform(normalizeAccountNumber)
    .pipe(
      z.string().refine(
        (val) => val === '' || /^[A-Za-z0-9]{5,34}$/.test(val),
        'Account number must be 5–34 alphanumeric characters (supports IBAN, Indian, US accounts)'
      )
    )
    .optional()
    .or(z.literal('')),

  ifsc_code: z
    .string()
    .transform(v => v.toUpperCase().replace(/\s/g, ''))
    .pipe(
      z.string().refine(
        (val) => val === '' || /^[A-Z0-9]{4,11}$/.test(val),
        'Enter a valid bank code (IFSC, SWIFT, or Sort Code — 4 to 11 characters)'
      )
    )
    .optional()
    .or(z.literal('')),

  upi_id: z
    .string()
    .refine(
      (val) => val === '' || /^[\w.\-]+@[\w.\-]+$/.test(val),
      'UPI ID must be in format handle@provider (e.g. name@upi)'
    )
    .optional()
    .or(z.literal('')),
})

// ─── Full schema (for server-side) ──────────────────────
export const clientFormSchema = step1Schema.merge(step2Schema).merge(step3Schema)

// ─── Per-field validation (for instant feedback on blur) ─
export type FieldErrors = Partial<Record<string, string>>

/** Validate a single step and return field-level errors */
export function validateStep(stepNum: number, data: Record<string, any>): FieldErrors {
  const schema = stepNum === 1 ? step1Schema : stepNum === 2 ? step2Schema : step3Schema
  const result = schema.safeParse(data)
  if (result.success) return {}

  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0]?.toString()
    if (field && !errors[field]) {
      errors[field] = issue.message
    }
  }
  return errors
}

/** Validate a single field and return its error (or empty string) */
export function validateField(stepNum: number, field: string, value: string, allData: Record<string, any>): string {
  const data = { ...allData, [field]: value }
  const schema = stepNum === 1 ? step1Schema : stepNum === 2 ? step2Schema : step3Schema
  const result = schema.safeParse(data)
  if (result.success) return ''

  const fieldIssue = result.error.issues.find(i => i.path[0]?.toString() === field)
  return fieldIssue?.message || ''
}
