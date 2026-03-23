const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.photos.sparkplatform.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd2bd5h5te3s67r.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3-us-west-2.amazonaws.com',
        pathname: '/cdn.simplyrets.com/**',
      },
    ],
  },
  async rewrites() {
    const apiTarget =
      process.env.API_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://127.0.0.1:3002';

    const apiBase = apiTarget.replace(/\/+$/, '');

    const neighborhoodSlugs = [
      'grand-rapids',
      'ada',
      'byron-center',
      'caledonia',
      'east-grand-rapids',
      'grandville',
      'kentwood',
      'rockford',
      'wyoming',
    ];

    return {
      beforeFiles: [
        // API proxy stays first
        { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
        { source: '/api/v1/:path*', destination: `${apiBase}/api/v1/:path*` },
        { source: '/', destination: '/marketing/index.html' },
        { source: '/buy', destination: '/marketing/buy.html' },
        { source: '/sell', destination: '/marketing/sell.html' },
        { source: '/build', destination: '/marketing/builder.html' },
        { source: '/builder', destination: '/marketing/builder.html' },
        { source: '/about', destination: '/marketing/about.html' },
        { source: '/contact', destination: '/marketing/contact.html' },
        { source: '/neighborhoods', destination: '/marketing/neighborhoods.html' },
        { source: '/privacy-policy', destination: '/marketing/privacy-policy.html' },
        { source: '/terms-of-use', destination: '/marketing/terms-of-use.html' },
        ...neighborhoodSlugs.map((slug) => ({
          source: `/${slug}`,
          destination: `/marketing/${slug}.html`,
        })),
        { source: '/assets/:path*', destination: '/marketing/assets/:path*' },
        { source: '/style.css', destination: '/marketing/style.css' },
        { source: '/robots.txt', destination: '/marketing/robots.txt' },
        { source: '/sitemap.xml', destination: '/marketing/sitemap.xml' },
        // Generic .html marketing routes (kept after specific exceptions)
        { source: '/:slug.html', destination: '/marketing/:slug.html' },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value:
              'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/search.html',
        destination: '/search',
        permanent: true,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
