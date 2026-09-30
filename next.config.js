/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Rewrites - serve static HTML files
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
      {
        source: '/impressum',
        destination: '/impressum.html',
      },
      {
        source: '/datenschutz',
        destination: '/datenschutz.html',
      },
      {
        source: '/jobs',
        destination: '/jobs.html',
      },
      {
        source: '/event-location',
        destination: '/event-location.html',
      },
      // Von scripts/build-pages.mjs erzeugte Seiten
      {
        source: '/tisch-reservieren',
        destination: '/tisch-reservieren.html',
      },
      {
        source: '/geburtstag-feiern-baden-baden',
        destination: '/geburtstag-feiern-baden-baden.html',
      },
      {
        source: '/events',
        destination: '/events/index.html',
      },
      {
        source: '/events/:slug',
        destination: '/events/:slug.html',
      },
    ];
  },
};

module.exports = nextConfig;
