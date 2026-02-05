/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output as static export for simple hosting, or 'standalone' for serverless
  // We use default for Vercel with API routes

  // Revalidation settings
  experimental: {
    // Enable ISR
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },

  // Redirects (optional)
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
