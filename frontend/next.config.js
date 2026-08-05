/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://51.83.103.21:20067/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
