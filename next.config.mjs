import withPWAInit from 'next-pwa';

// Only enable PWA for mobile builds
const isMobileBuild = process.env.MOBILE_BUILD === 'true';

const withPWA = isMobileBuild ? withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
}) : (config) => config;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static export for mobile builds, not dev/regular builds
  ...(isMobileBuild && {
    output: 'export',
    trailingSlash: true,
    skipTrailingSlashRedirect: true,
    distDir: 'out',
  }),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fast build optimizations
  swcMinify: false, // Disable minification for faster builds
  compiler: {
    removeConsole: false,
  },
  // Disable optimizations for faster builds
  optimizeFonts: false,
  poweredByHeader: false,
  // Configure external image domains for Next.js Image component  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dynamic-assets.coinbase.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static1.tokenterminal.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'zengo.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's3.coinmarketcap.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's2.coinmarketcap.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media-cldnry.s-nbcnews.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Workaround for WalletConnect build issues
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default withPWA(nextConfig);
