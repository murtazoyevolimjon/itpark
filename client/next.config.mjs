/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors must fail the build instead of shipping silently
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
