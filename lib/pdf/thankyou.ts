import QRCode from 'qrcode'
import { LOGO_IMG_TAG } from './logo'
import { Client } from '@/types'

export async function generateThankyouHTML(client: Client, portalUrl?: string): Promise<string> {
  const completionDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const firstName = client.name.split(' ')[0]

  const qrUrl = portalUrl || 'https://autonex-docs-8x12.vercel.app'
  const qrDataUri = await QRCode.toDataURL(`${qrUrl}/dashboard`, {
    width: 70, margin: 1,
    color: { dark: '#0A0F1E', light: '#FFFFFF' },
  })

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<title>Thank You — ${client.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;font-size:13px;line-height:1.7}
.page{max-width:780px;margin:0 auto}
.header{background:#0A0F1E;padding:28px 48px;display:flex;align-items:center;justify-content:space-between}
.brand-name{font-size:18px;font-weight:700;color:white}
.brand-tagline{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;margin-top:2px}
.doc-badge{background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);border-radius:8px;padding:8px 16px;text-align:right}
.doc-badge p{font-size:9px;color:#60A5FA;letter-spacing:2px;text-transform:uppercase;font-weight:700}
.doc-badge span{font-size:13px;color:white;font-weight:600}
.accent-bar{height:4px;background:linear-gradient(90deg,#3B82F6,#0060FF)}
.hero{background:linear-gradient(135deg,#0A0F1E,#1a2744);padding:48px;text-align:center}
.stars{font-size:24px;letter-spacing:6px;margin-bottom:16px}
.hero-title{font-size:38px;font-weight:800;color:white;letter-spacing:-1.5px;line-height:1.1}
.hero-subtitle{font-size:12px;color:#60A5FA;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-top:10px}
.hero-name{font-size:15px;color:rgba(255,255,255,0.6);margin-top:8px}
.body{padding:36px 48px}
.intro{font-size:14px;color:#444;line-height:1.85;margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #eee}
.section-title{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#60A5FA;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:#eee}
.summary-table{width:100%;border-collapse:collapse;margin-bottom:28px}
.summary-table th{background:#0A0F1E;color:white;text-align:left;padding:9px 14px;font-size:11px}
.summary-table td{padding:10px 14px;font-size:12px;border-bottom:1px solid #f0f0f0}
.summary-table tr:nth-child(even) td{background:#fafbff}
.teal{color:#60A5FA;font-weight:700}
.blue{color:#60A5FA;font-weight:700}
.checklist{margin-bottom:28px}
.check-item{display:flex;align-items:flex-start;gap:12px;margin-bottom:10px;padding:10px 14px;background:#f8f9ff;border-radius:8px}
.check-icon{width:22px;height:22px;background:#60A5FA;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;color:white;font-weight:700}
.check-text{font-size:12.5px;color:#333;line-height:1.4}
.referral-box{background:linear-gradient(135deg,#0A0F1E,#1a2744);border-radius:12px;padding:24px 28px;margin-bottom:24px;text-align:center}
.referral-box h3{font-size:16px;font-weight:800;color:white;margin-bottom:8px}
.referral-box p{font-size:12px;color:rgba(255,255,255,0.6);line-height:1.6}
.referral-amount{font-size:28px;font-weight:900;color:#60A5FA;margin:12px 0 8px}
.review-box{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
.review-card{border:1.5px solid #eee;border-radius:10px;padding:16px;text-align:center}
.review-card h4{font-size:12px;font-weight:700;color:#0A0F1E;margin-bottom:4px}
.review-card p{font-size:11px;color:#888}
.review-card .icon{font-size:22px;margin-bottom:8px}
.sign-off{text-align:center;margin-top:28px;padding:24px;background:linear-gradient(135deg,#f0f5ff,#fff);border-radius:12px;border:1px solid #bfdbfe}
.footer{background:#f8f9ff;padding:16px 48px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #eee;margin-top:36px}
.footer p{font-size:10px;color:#aaa}
</style></head>
<body><div class="page">

<div class="header">
  <div>
    ${LOGO_IMG_TAG()}
  </div>
  <div class="doc-badge"><p>Document</p><span>Project Completion</span></div>
</div>
<div class="accent-bar"></div>

<div class="hero">
  <div class="stars">⭐⭐⭐⭐⭐</div>
  <h1 class="hero-title">Thank You</h1>
  <p class="hero-subtitle">For Choosing Autonex AI</p>
  <p class="hero-name">Project Completed · ${completionDate}</p>
</div>

<div class="body">
  <p class="intro">
    Dear <strong>${client.name}</strong>,<br/><br/>
    It has been an absolute privilege working with you. This document marks the successful completion of your
    <strong>${client.service}</strong> project with Autonex AI Technologies. We hope the results have exceeded your
    expectations and are proud to have been a part of your automation journey.<br/><br/>
    Thank you for your trust, your collaboration, and for choosing us. We look forward to continuing to serve you.
  </p>

  <div class="section-title">Project Results Summary</div>
  <table class="summary-table">
    <thead><tr><th>Detail</th><th>Information</th></tr></thead>
    <tbody>
      <tr><td>Client Name</td><td><strong>${client.name}</strong></td></tr>
      <tr><td>Service Delivered</td><td>${client.service}</td></tr>
      <tr><td>Total Project Value</td><td class="blue">₹${client.total_fee.toLocaleString('en-IN')}</td></tr>
      <tr><td>Completion Date</td><td>${completionDate}</td></tr>
      <tr><td>Status</td><td><span style="color:#60A5FA;font-weight:700">✓ Successfully Completed</span></td></tr>
    </tbody>
  </table>

  <div class="section-title">Project Handover Checklist</div>
  <div class="checklist">
    <div class="check-item"><div class="check-icon">✓</div><div class="check-text">All project files and deliverables have been shared via agreed channels</div></div>
    <div class="check-item"><div class="check-icon">✓</div><div class="check-text">Complete documentation and user guides have been provided</div></div>
    <div class="check-item"><div class="check-icon">✓</div><div class="check-text">Final invoice settled and payment confirmed</div></div>
    <div class="check-item"><div class="check-icon">✓</div><div class="check-text">Platform and system access fully transferred to client</div></div>
    <div class="check-item"><div class="check-icon">✓</div><div class="check-text">30-day post-launch support window begins from completion date</div></div>
  </div>

  <div class="referral-box">
    <h3>🎁 Refer a Client — Earn Rewards</h3>
    <p>Know someone who could benefit from AI automation or web development?</p>
    <div class="referral-amount">₹5,000</div>
    <p style="color:#60A5FA;font-weight:600;margin-bottom:8px">Credit for every successful referral</p>
    <p>Email us at <span style="color:#60A5FA">hello@autonexai.org</span> with your referral's details.</p>
  </div>

  <div class="section-title">Leave Us a Review</div>
  <div class="review-box">
    <div class="review-card">
      <div class="icon">🌐</div>
      <h4>Google Review</h4>
      <p>Search "Autonex AI" on Google Maps and leave your feedback</p>
    </div>
    <div class="review-card">
      <div class="icon">💼</div>
      <h4>LinkedIn Recommendation</h4>
      <p>Recommend us on LinkedIn — it means the world to us</p>
    </div>
  </div>

  <div class="sign-off">
    <p style="font-size:15px;color:#0A0F1E;font-weight:600;margin-bottom:8px">It was a pleasure, ${firstName}.</p>
    <p style="font-size:13px;color:#555;margin-bottom:16px;line-height:1.6">We're always here if you need us — for future projects, maintenance, or a quick question. Once an Autonex client, always a part of our family.</p>
    <p style="font-size:17px;font-weight:800;color:#60A5FA">The Autonex AI Team</p>
    <p style="font-size:11px;color:#999;margin-top:4px;font-style:italic">Automate Today. Lead Tomorrow.</p>
    <p style="font-size:11px;color:#60A5FA;margin-top:8px;font-weight:600">hello@autonexai.org · autonexai.org</p>
  </div>
</div>

<div class="footer">
  <p>Thank you for your partnership, ${client.name}</p>
  <p><span style="color:#60A5FA;font-weight:600">autonexai.org</span> · hello@autonexai.org</p>
</div>

</div></body></html>`
}
