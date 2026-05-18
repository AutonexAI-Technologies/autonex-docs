// Dynamic import so Vercel doesn't bundle chromium unnecessarily
export async function generatePDF(html: string): Promise<Buffer> {
  let browser: any

  try {
    // Vercel / serverless environment
    if (process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.VERCEL) {
      const chromium = await import('@sparticuz/chromium')
      const puppeteer = await import('puppeteer-core')

      browser = await (puppeteer.default as any).launch({
        args: chromium.default.args,
        defaultViewport: (chromium.default as any).defaultViewport ?? null,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      })
    } else {
      // Local development — use puppeteer-core with system Chrome
      const puppeteer = await import('puppeteer-core')

      // Try common Chrome paths on macOS/Linux/Windows
      const executablePath =
        process.platform === 'darwin'
          ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
          : process.platform === 'win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : '/usr/bin/google-chrome'

      browser = await (puppeteer.default as any).launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath,
        headless: true,
      })
    }

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })

    return Buffer.from(pdf)
  } finally {
    if (browser) await browser.close()
  }
}
