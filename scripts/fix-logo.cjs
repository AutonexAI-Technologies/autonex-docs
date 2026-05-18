const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const b64 = fs.readFileSync(path.join(root, 'public/logo_small.png')).toString('base64')
const dataUri = 'data:image/png;base64,' + b64
const logoImg = '<img src="' + dataUri + '" alt="Autonex AI" style="height:40px;object-fit:contain;max-width:200px;" />'

// Patterns to replace (text-only brand headers) in PDF templates
const OLD_BRAND_1 = '<div class="brand-name">Autonex AI</div>\n    <div class="brand-tagline">Automate Today. Lead Tomorrow.</div>'
const OLD_BRAND_2 = '<div class="brand-name">Autonex AI</div>\n  <div class="brand-tagline">Automate Today. Lead Tomorrow.</div>'
const OLD_BRAND_CONTRACT = [
  '      <div class="brand-icon">',
  '        <svg viewBox="0 0 24 24" fill="none" stroke="#00D4AA" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  '      </div>',
  '      <div>',
  '        <div class="brand-name">Autonex AI</div>',
  '        <div class="brand-tagline">Automate Today. Lead Tomorrow.</div>',
  '      </div>',
].join('\n')

// ── invoice.ts ──────────────────────────────────────────────────────────────
let invoice = fs.readFileSync(path.join(root, 'lib/pdf/invoice.ts'), 'utf8')
// Remove any bad import
invoice = invoice.replace("import { LOGO_BASE64 } from './logo'\n", '')
// Fix the broken img tag left by previous attempt
invoice = invoice.replace(/<img src="\\?\$\{LOGO_BASE64\}"[^\/]*\/>/g, logoImg)
// Fix escaped invoiceNum
invoice = invoice.replace(/\\\${invoiceNum}/g, '${invoiceNum}')
// Replace text brand if still present
invoice = invoice.replace(OLD_BRAND_1, logoImg)
invoice = invoice.replace(OLD_BRAND_2, logoImg)
fs.writeFileSync(path.join(root, 'lib/pdf/invoice.ts'), invoice)
console.log('invoice.ts done, length:', invoice.length)

// ── contract.ts ──────────────────────────────────────────────────────────────
let contract = fs.readFileSync(path.join(root, 'lib/pdf/contract.ts'), 'utf8')
contract = contract.replace(OLD_BRAND_CONTRACT, logoImg)
contract = contract.replace(OLD_BRAND_1, logoImg)
fs.writeFileSync(path.join(root, 'lib/pdf/contract.ts'), contract)
console.log('contract.ts done, length:', contract.length)

// ── welcome.ts ───────────────────────────────────────────────────────────────
let welcome = fs.readFileSync(path.join(root, 'lib/pdf/welcome.ts'), 'utf8')
welcome = welcome.replace(OLD_BRAND_1, logoImg)
welcome = welcome.replace(OLD_BRAND_2, logoImg)
fs.writeFileSync(path.join(root, 'lib/pdf/welcome.ts'), welcome)
console.log('welcome.ts done, length:', welcome.length)

// ── thankyou.ts ───────────────────────────────────────────────────────────────
let thankyou = fs.readFileSync(path.join(root, 'lib/pdf/thankyou.ts'), 'utf8')
thankyou = thankyou.replace(OLD_BRAND_1, logoImg)
thankyou = thankyou.replace(OLD_BRAND_2, logoImg)
fs.writeFileSync(path.join(root, 'lib/pdf/thankyou.ts'), thankyou)
console.log('thankyou.ts done, length:', thankyou.length)

console.log('\nDone — all 4 PDF templates now use the logo image.')
