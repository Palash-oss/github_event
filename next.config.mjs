/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable Webpack caching on Windows to prevent HMR compilation loops and file locks
      config.cache = false;
    }
    return config;
  }
};

export default nextConfig;