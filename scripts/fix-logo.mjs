import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const b64 = fs.readFileSync(path.join(root, 'public/logo_small.png')).toString('base64')
const dataUri = `data:image/png;base64,${b64}`
const logoImg = `<img src="${dataUri}" alt="Autonex AI" style="height:40px;object-fit:contain;max-width:200px;" />`

// ── invoice.ts ──────────────────────────────────────────────────────────────
let invoice = fs.readFileSync(path.join(root, 'lib/pdf/invoice.ts'), 'utf8')
// Remove bad import
invoice = invoice.replace(`import { LOGO_BASE64 } from './logo'\n`, '')
// Replace broken img tag (escaped by replace tool)
invoice = invoice.replace(
  `<img src="\\${LOGO_BASE64}" alt="Autonex AI" style="height:36px;object-fit:contain;" />`,
  logoImg
)
// Restore escaped invoiceNum
invoice = invoice.replace(/\\\$\{invoiceNum\}/g, '${invoiceNum}')
// If header still has old text, replace it
invoice = invoice.replace(
  `<div class="brand-name">Autonex AI</div>\n    <div class="brand-tagline">Automate Today. Lead Tomorrow.</div>`,
  logoImg
)
fs.writeFileSync(path.join(root, 'lib/pdf/invoice.ts'), invoice)
console.log('✅ invoice.ts updated')

// ── contract.ts ─────────────────────────────────────────────────────────────
let contract = fs.readFileSync(path.join(root, 'lib/pdf/contract.ts'), 'utf8')
contract = contract.replace(
  `      <div class="brand-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="#00D4AA" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
      </div>
      <div>
        <div class="brand-name">Autonex AI</div>
        <div class="brand-tagline">Automate Today. Lead Tomorrow.</div>
      </div>`,
  logoImg
)
fs.writeFileSync(path.join(root, 'lib/pdf/contract.ts'), contract)
console.log('✅ contract.ts updated')

// ── welcome.ts ───────────────────────────────────────────────────────────────
let welcome = fs.readFileSync(path.join(root, 'lib/pdf/welcome.ts'), 'utf8')
welcome = welcome.replace(
  `<div class="brand-name">Autonex AI</div>\n    <div class="brand-tagline">Automate Today. Lead Tomorrow.</div>`,
  logoImg
)
fs.writeFileSync(path.join(root, 'lib/pdf/welcome.ts'), welcome)
console.log('✅ welcome.ts updated')

// ── thankyou.ts ───────────────────────────────────────────────────────────────
let thankyou = fs.readFileSync(path.join(root, 'lib/pdf/thankyou.ts'), 'utf8')
thankyou = thankyou.replace(
  `<div class="brand-name">Autonex AI</div>\n    <div class="brand-tagline">Automate Today. Lead Tomorrow.</div>`,
  logoImg
)
fs.writeFileSync(path.join(root, 'lib/pdf/thankyou.ts'), thankyou)
console.log('✅ thankyou.ts updated')

console.log('Done — all 4 PDF templates now use the logo image.')
