import { LOGO_IMG_TAG } from './logo'
import { Client } from '@/types'

export function generateContractHTML(client: Client): string {
  const deposit = client.deposit_fee || client.total_fee * 0.5
  const remaining = client.total_fee - deposit
  const date = client.start_date
    ? new Date(client.start_date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Client Contract — ${client.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1a1a2e; font-size: 13px; line-height: 1.6; }

  .page { max-width: 780px; margin: 0 auto; padding: 0; }

  /* Header */
  .header { background: #0A0F1E; color: white; padding: 32px 48px 28px; display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-icon { width: 40px; height: 40px; background: rgba(0,212,170,0.2); border: 1.5px solid rgba(0,212,170,0.4); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .brand-icon svg { width: 20px; height: 20px; }
  .brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
  .brand-tagline { font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 22px; font-weight: 800; letter-spacing: -1px; color: white; }
  .doc-title p { font-size: 10px; color: #00D4AA; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }

  /* Teal bar */
  .accent-bar { height: 4px; background: linear-gradient(90deg, #00D4AA 0%, #0080ff 100%); }

  /* Body */
  .body { padding: 36px 48px; }

  /* Party section */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; padding-bottom: 28px; border-bottom: 1px solid #eee; }
  .party-box { background: #f8f9ff; border-radius: 10px; padding: 18px 20px; border-left: 3px solid #00D4AA; }
  .party-box h3 { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #00D4AA; font-weight: 700; margin-bottom: 10px; }
  .party-box p { font-size: 12px; color: #333; margin-bottom: 4px; }
  .party-box .name { font-size: 15px; font-weight: 700; color: #0A0F1E; margin-bottom: 8px; }

  /* Section heading */
  .section-title { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #00D4AA; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: #eee; }

  /* Clauses */
  .clause { margin-bottom: 20px; }
  .clause-number { display: inline-block; background: #0A0F1E; color: #00D4AA; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-bottom: 6px; }
  .clause h4 { font-size: 13px; font-weight: 700; color: #0A0F1E; margin-bottom: 5px; }
  .clause p { font-size: 12px; color: #555; line-height: 1.7; }

  /* Payment table */
  .payment-table { width: 100%; border-collapse: collapse; margin: 12px 0 8px; }
  .payment-table th { background: #0A0F1E; color: #fff; text-align: left; padding: 9px 14px; font-size: 11px; }
  .payment-table td { padding: 9px 14px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
  .payment-table tr:last-child td { font-weight: 700; background: #f8f9ff; }
  .teal { color: #00D4AA; font-weight: 700; }

  /* Signatures */
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; padding-top: 28px; border-top: 1px solid #eee; }
  .sig-box { }
  .sig-line { border-bottom: 2px solid #0A0F1E; margin-bottom: 8px; height: 40px; }
  .sig-label { font-size: 11px; font-weight: 700; color: #0A0F1E; }
  .sig-sub { font-size: 10px; color: #999; margin-top: 3px; }

  /* Footer */
  .footer { background: #f8f9ff; padding: 16px 48px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; margin-top: 40px; }
  .footer p { font-size: 10px; color: #aaa; }
  .footer .teal { color: #00D4AA; font-weight: 600; }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="brand">
${LOGO_IMG_TAG()}
    </div>
    <div class="doc-title">
      <h1>CLIENT CONTRACT</h1>
      <p>Service Agreement</p>
    </div>
  </div>
  <div class="accent-bar"></div>

  <div class="body">

    <!-- Parties -->
    <div class="parties">
      <div class="party-box">
        <h3>Service Provider</h3>
        <div class="name">Autonex AI Technologies</div>
        <p>hello@autonexai.org</p>
        <p>autonexai.org</p>
        <p>Hyderabad, India</p>
      </div>
      <div class="party-box">
        <h3>Client</h3>
        <div class="name">${client.name}</div>
        <p>${client.email}</p>
        ${client.phone ? `<p>${client.phone}</p>` : ''}
        ${client.company ? `<p>${client.company}</p>` : ''}
      </div>
    </div>

    <!-- Project Summary -->
    <div class="section-title">Project Overview</div>
    <table class="payment-table" style="margin-bottom:28px;">
      <tr><th>Detail</th><th>Information</th></tr>
      <tr><td>Service</td><td>${client.service}</td></tr>
      <tr><td>Contract Date</td><td>${date}</td></tr>
      <tr><td>Total Project Fee</td><td class="teal">₹${client.total_fee.toLocaleString('en-IN')}</td></tr>
      <tr><td>Deposit (50% — Due Immediately)</td><td class="teal">₹${deposit.toLocaleString('en-IN')}</td></tr>
      <tr><td>Remaining (Due on Completion)</td><td>₹${remaining.toLocaleString('en-IN')}</td></tr>
    </table>

    <!-- Clauses -->
    <div class="section-title">Contract Terms & Conditions</div>

    <div class="clause">
      <div class="clause-number">01</div>
      <h4>Scope of Work</h4>
      <p>Autonex AI Technologies agrees to deliver the services described under "${client.service}" as mutually agreed upon between both parties. The exact deliverables, features, and specifications will be detailed in a separate project brief shared prior to commencement. Any work falling outside the agreed scope will require a separate written agreement.</p>
    </div>

    <div class="clause">
      <div class="clause-number">02</div>
      <h4>Payment Terms</h4>
      <p>A non-refundable deposit of ₹${deposit.toLocaleString('en-IN')} (50% of the total project fee) is due immediately upon signing this contract. The remaining balance of ₹${remaining.toLocaleString('en-IN')} is due upon project completion and final delivery. Work will not commence until the deposit is received and confirmed.</p>
    </div>

    <div class="clause">
      <div class="clause-number">03</div>
      <h4>Timeline & Milestones</h4>
      <p>Project timelines will be provided in the onboarding welcome document. Autonex AI Technologies will make every effort to meet agreed deadlines. Delays caused by the client (e.g., late provision of required assets or approvals) will extend timelines accordingly and do not constitute a breach of contract.</p>
    </div>

    <div class="clause">
      <div class="clause-number">04</div>
      <h4>Revisions Policy</h4>
      <p>This engagement includes up to two (2) rounds of revisions within the agreed scope. Additional revisions or changes to project scope will be billed at ₹2,500 per hour or as separately quoted. Revision requests must be submitted in writing within 7 days of delivery.</p>
    </div>

    <div class="clause">
      <div class="clause-number">05</div>
      <h4>Intellectual Property</h4>
      <p>Upon receipt of full payment, all deliverables created under this contract become the exclusive property of the client. Autonex AI Technologies retains the right to display work in portfolios unless explicitly instructed otherwise in writing. Any third-party tools, APIs, or software used remain subject to their respective licenses.</p>
    </div>

    <div class="clause">
      <div class="clause-number">06</div>
      <h4>Confidentiality</h4>
      <p>Both parties agree to keep confidential all proprietary information, trade secrets, business strategies, and client data shared during the course of this engagement. This obligation survives the termination of this contract indefinitely.</p>
    </div>

    <div class="clause">
      <div class="clause-number">07</div>
      <h4>Termination</h4>
      <p>Either party may terminate this contract with 14 days written notice. In the event of client-initiated termination, the 50% deposit is non-refundable. Work completed up to the date of termination will be invoiced and payable. Autonex AI retains the right to terminate immediately for non-payment or breach of terms.</p>
    </div>

    <div class="clause">
      <div class="clause-number">08</div>
      <h4>Limitation of Liability</h4>
      <p>Autonex AI Technologies' total liability under this contract shall not exceed the total fees paid by the client. We are not liable for indirect, incidental, or consequential damages, including but not limited to loss of profits, data, or business opportunities.</p>
    </div>

    <div class="clause">
      <div class="clause-number">09</div>
      <h4>Governing Law</h4>
      <p>This contract shall be governed by the laws of India. Any disputes arising from this agreement shall be subject to the exclusive jurisdiction of the courts of Hyderabad, Telangana. Both parties agree to attempt resolution through good-faith negotiation before resorting to legal proceedings.</p>
    </div>

    <!-- Signatures -->
    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Autonex AI Technologies</div>
        <div class="sig-sub">Authorised Signatory · Date: ___________</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">${client.name}</div>
        <div class="sig-sub">Client · Date: ___________</div>
      </div>
    </div>

  </div>

  <div class="footer">
    <p>This document is legally binding upon both parties once signed.</p>
    <p><span class="teal">autonexai.org</span> · hello@autonexai.org</p>
  </div>

</div>
</body>
</html>`
}
