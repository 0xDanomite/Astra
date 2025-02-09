import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    CDP_API_KEY_NAME: process.env.CDP_API_KEY_NAME!,
    CDP_API_KEY_PRIVATE_KEY: process.env.CDP_API_KEY_PRIVATE_KEY!,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    NETWORK_ID: process.env.NETWORK_ID || 'base-sepolia',
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY!,
    NILLION_API_KEY: process.env.NILLION_API_KEY!,
    DATABASE_URL: process.env.DATABASE_URL!,
  },
};

export default nextConfig;
