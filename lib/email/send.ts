import { Resend } from 'resend'
import { Client } from '@/types'

// Update this to your verified Resend sender domain
// During testing, use 'onboarding@resend.dev' (works without domain verification)
const FROM_EMAIL = 'Autonex AI <noreply@autonexai.org>'

const docTitles: Record<string, string> = {
  contract: 'Client Contract',
  welcome: 'Welcome & Onboarding',
  invoice: 'Invoice',
  thankyou: 'Thank You & Offboarding',
}

export async function sendDocumentEmail(
  client: Client,
  docType: string,
  pdfBase64: string,
  docTitle: string
): Promise<void> {
  // Lazy-init so build doesn't crash if env var not set at compile time
  const resend = new Resend(process.env.RESEND_API_KEY)

  const title = docTitle || docTitles[docType] || 'Document'
  const firstName = client.name.split(' ')[0]

  const emailBody = getEmailBody(docType, firstName, client)

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: client.email,
    subject: `${title} — Autonex AI Technologies`,
    html: emailBody,
    attachments: [
      {
        filename: `${docType}-${client.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        content: pdfBase64,
      },
    ],
  })

  if (error) {
    throw new Error(error.message)
  }
}

function getEmailBody(docType: string, firstName: string, client: Client): string {
  const baseStyle = `font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0A0F1E;border-radius:16px;overflow:hidden`
  const headerStyle = `background:#0A0F1E;padding:28px 32px;border-bottom:3px solid #00D4AA`
  const bodyStyle = `background:#fff;padding:32px`
  const footerStyle = `background:#f8f9ff;padding:16px 32px;text-align:center;border-top:1px solid #eee`

  const bodies: Record<string, string> = {
    contract: `
      <p>Dear ${firstName},</p>
      <p style="margin-top:14px">Please find your <strong>Client Contract</strong> attached. This is a legally binding agreement covering the scope, payment terms, and all conditions for your <strong>${client.service}</strong> project.</p>
      <p style="margin-top:14px"><strong>Next step:</strong> Please review, sign, and return the contract within 48 hours to get your project started.</p>
    `,
    welcome: `
      <p>Dear ${firstName},</p>
      <p style="margin-top:14px">Welcome to <strong>Autonex AI</strong>! 🎉 We're absolutely thrilled to have you on board.</p>
      <p style="margin-top:14px">Your <strong>Welcome & Onboarding</strong> document is attached. It contains everything you need to know about your project, what's included, and what we need from you within the next 48 hours.</p>
    `,
    invoice: `
      <p>Dear ${firstName},</p>
      <p style="margin-top:14px">Please find your <strong>Invoice</strong> attached for the 50% project deposit of <strong>₹${(client.deposit_fee || client.total_fee * 0.5).toLocaleString('en-IN')}</strong>.</p>
      <p style="margin-top:14px">Payment is due within 15 days. Bank transfer and UPI details are included in the attached PDF. Once received, your project will commence immediately.</p>
    `,
    thankyou: `
      <p>Dear ${firstName},</p>
      <p style="margin-top:14px">It has been an absolute pleasure working with you on your <strong>${client.service}</strong> project. 🙏</p>
      <p style="margin-top:14px">Your <strong>Project Completion</strong> document is attached, including your handover checklist and referral programme details. We hope the results exceeded your expectations.</p>
    `,
  }

  const bodyContent = bodies[docType] || `<p>Dear ${firstName},</p><p style="margin-top:14px">Please find your document attached from Autonex AI Technologies.</p>`

  return `
    <div style="${baseStyle}">
      <div style="${headerStyle}">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="font-size:18px;font-weight:800;color:white;letter-spacing:-0.5px">Autonex AI</div>
        </div>
        <div style="font-size:10px;color:#00D4AA;letter-spacing:2px;text-transform:uppercase;margin-top:3px">Automate Today. Lead Tomorrow.</div>
      </div>
      <div style="${bodyStyle}">
        <div style="font-size:14px;color:#333;line-height:1.8">
          ${bodyContent}
          <p style="margin-top:20px;color:#888;font-size:13px">If you have any questions, don't hesitate to reach out — we're always here.</p>
        </div>
        <div style="margin-top:28px;padding:18px 20px;background:#f0fff9;border-radius:10px;border-left:4px solid #00D4AA">
          <p style="font-size:12px;color:#00D4AA;font-weight:700;margin-bottom:4px">Your Contact</p>
          <p style="font-size:13px;color:#333">hello@autonexai.org · autonexai.org</p>
        </div>
      </div>
      <div style="${footerStyle}">
        <p style="font-size:11px;color:#aaa">© Autonex AI Technologies · Hyderabad, India</p>
        <p style="font-size:11px;color:#00D4AA;margin-top:4px;font-weight:600">autonexai.org</p>
      </div>
    </div>
  `
}
