'use client'

import { motion } from "framer-motion";
import Image from "next/image";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-16 bg-deep-space/80 backdrop-blur-sm border-b border-stellar-blue/20"
    >
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg" // We'll need to create this
            alt="ASTRA Logo"
            width={32}
            height={32}
          />
          <span className="font-space text-xl font-bold bg-cosmic-gradient text-transparent bg-clip-text">
            ASTRA
          </span>
        </div>

        {/* Wallet connection will go here */}
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 rounded-full bg-cosmic-gradient text-neural-white font-space">
            Connect Wallet
          </button>
        </div>
      </div>
    </motion.header>
  );
}
