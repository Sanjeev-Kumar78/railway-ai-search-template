/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,

    // Environment variables
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    },

    // Asset optimization
    images: {
        unoptimized: true
    }
}

module.exports = nextConfig
