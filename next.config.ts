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
    NEXT_PUBLIC_APP_URL: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_USE_APP_SCHEDULER: process.env.NEXT_PUBLIC_USE_APP_SCHEDULER,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
};

export default nextConfig;
