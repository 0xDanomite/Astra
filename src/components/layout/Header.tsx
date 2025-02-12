'use client'

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useWallets } from "@privy-io/react-auth";

export function Header() {
  const { userId, isAuthenticated } = useAuth();
  const { wallets } = useWallets();
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgentAddress() {
      if (!userId) return;

      try {
        const response = await fetch(`/api/wallet/address?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setAgentAddress(data.address);
        }
      } catch (error) {
        console.error('Failed to fetch agent address:', error);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchAgentAddress();
    }
  }, [isAuthenticated, userId]);

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-16 bg-deep-space/80 backdrop-blur-sm border-b border-stellar-blue/20"
    >
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* <Image
            src="/logo.svg" // We'll need to create this
            alt="ASTRA Logo"
            width={32}
            height={32}
          /> */}
          <span
            className="font-space text-xl font-bold"
            style={{
              background: 'linear-gradient(to right, #0EA5E9, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            ASTRA
          </span>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAuthenticated ? (
            <div className="flex flex-col items-end gap-1">
              <div className="text-sm text-stellar-blue/80">
                User: {shortenAddress(wallets[0]?.address || '')}
              </div>
              {agentAddress && (
                <div className="text-sm text-cosmic-purple/80">
                  Agent: {shortenAddress(agentAddress)}
                </div>
              )}
            </div>
          ) : (
            <button
              className="px-4 py-2 rounded-full font-space text-neural-white"
              style={{
                background: 'linear-gradient(to right, #0EA5E9, #8B5CF6)',
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
