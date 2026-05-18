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
<img src="data:image/png;base64,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" alt="Autonex AI" style="height:40px;object-fit:contain;max-width:200px;" />
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
