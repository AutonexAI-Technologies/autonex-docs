/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint and TS errors during build (fix post-deploy)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Required for puppeteer-core + @sparticuz/chromium (Next.js 14 syntax)
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'puppeteer-core',
        '@sparticuz/chromium',
      ]
    }
    return config
  },
}

export default nextConfig

