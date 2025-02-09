'use client'

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function Header() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWalletAddress() {
      try {
        const response = await fetch('/api/wallet/address');
        if (response.ok) {
          const data = await response.json();
          setWalletAddress(
            `${data.address.slice(0, 6)}...${data.address.slice(-4)}`
          );
        }
      } catch (error) {
        console.error('Failed to fetch wallet address:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWalletAddress();
  }, []);

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
          <span className="font-space text-xl font-bold text-cosmic-gradient">
            ASTRA
          </span>
        </div>

        {/* Wallet connection will go here */}
        <div className="flex items-center gap-4">
          <button className="px-4 py-2 rounded-full bg-cosmic-gradient text-neural-white font-space">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : walletAddress ? (
              walletAddress
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
