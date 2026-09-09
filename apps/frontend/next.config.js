const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({
        enabled: true,
      })
    : (x) => x;

const getCdnImagePattern = () => {
  try {
    const url = new URL(process.env.CDN_BASE_URL);
    return [
      {
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
        port: url.port,
        pathname: `${url.pathname}/**`,
      },
    ];
  } catch {
    return [];
  }
};

/** @type {import('next').NextConfig} */
module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['api-client'],
  // Emits .next/standalone with a self-contained server.js and only the modules
  // actually traced as reachable. Both deploy.sh and the container image copy
  // from that directory.
  output: 'standalone',
  images: {
    // `images.domains` was removed in Next.js 16; the CDN host is covered by
    // getCdnImagePattern() in remotePatterns below.
    remotePatterns: [
      ...getCdnImagePattern(),
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**',
      },
      //for dummy data generated avatar usage
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/u/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        port: '',
        pathname: '/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/**',
      },
    ],
  },
});
