import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'robohash.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
    },
      {
        protocol: 'https',
        hostname: "i.pravatar.cc",
        port: '',
        pathname: '/**',
    },
      {
        protocol: 'https',
        hostname: "ui-avatars.com",
        port: '',
        pathname: '/**',
    },
      {
        protocol: 'https',
        hostname: "randomuser.me",
        port: '',
        pathname: '/**',
    },
      {
        protocol: 'https',
        hostname: "api.dicebear.com",
        port: '',
        pathname: '/**',
    },
    ],
  },
};

export default nextConfig;
