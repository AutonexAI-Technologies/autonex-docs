import fs from 'fs'
import path from 'path'

// Read logo from filesystem at runtime (server-side only, never bundled by webpack)
// Falls back to empty string if file not found (e.g. in test environments)
function readLogo(): string {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo_small.png')
    const b64 = fs.readFileSync(logoPath).toString('base64')
    return `data:image/png;base64,${b64}`
  } catch {
    return ''
  }
}

export function getLogoDataUri(): string {
  return readLogo()
}

export const LOGO_IMG_TAG = (height = 40): string => {
  const src = readLogo()
  if (!src) return '<div style="font-size:18px;font-weight:700;color:white;">Autonex AI</div>'
  return `<img src="${src}" alt="Autonex AI" style="height:${height}px;object-fit:contain;max-width:220px;" />`
}
