import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // ── Bundle & import optimizations ──
  // modularizeImports removed — conflicts with optimizePackageImports
  // and causes stale chunk references (vendor-chunks/lucide-react.js)
  // in incremental dev-server builds.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Production source maps only in dev (saves ~2MB in production)
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split heavy libraries into separate chunks for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          // Separate lucide-react icons into their own chunk
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide-icons',
            chunks: 'all',
            priority: 20,
          },
          // Separate recharts into its own chunk (loaded on demand via dynamic imports)
          recharts: {
            test: /[\\/]node_modules[\\/](recharts|d3-|internmap|delaunator|robust-predicates)[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 15,
          },
          // Separate framer-motion
          framerMotion: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: 'framer-motion',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8000/api/v1/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
