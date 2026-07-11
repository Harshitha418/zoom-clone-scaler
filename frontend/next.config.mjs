/** @type {import('next').NextConfig} */
const backendTarget = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
