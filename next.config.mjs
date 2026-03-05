/** @type {import('next').NextConfig} */
const nextConfig = {
  // Rewrite root to serve the static index.html
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
    ];
  },
};

export default nextConfig;
