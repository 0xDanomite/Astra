import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-space': '#1A1B31',
        'stellar-blue': '#0EA5E9',
        'cosmic-purple': '#8B5CF6',
        'neural-white': '#F8FAFC',
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        space: ['Space Grotesk', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'cosmic-gradient': 'linear-gradient(to right, #0EA5E9, #8B5CF6)',
      }
    },
  },
  plugins: [],
} satisfies Config;
