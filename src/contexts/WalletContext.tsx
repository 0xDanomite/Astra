'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

type WalletContextType = {
  walletData: any;
  address: string | null;
  isLoading: boolean;
  error: string | null;
};

const WalletContext = createContext<WalletContextType>({
  walletData: null,
  address: null,
  isLoading: true,
  error: null,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const [walletData, setWalletData] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWalletData() {
      if (!userId) return;

      try {
        // Initialize wallet through API
        const initResponse = await fetch('/api/wallet/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        if (!initResponse.ok) {
          throw new Error('Failed to initialize wallet');
        }

        // Get address through separate API call
        const addressResponse = await fetch(`/api/wallet/address?userId=${userId}`);
        if (!addressResponse.ok) {
          throw new Error('Failed to fetch wallet address');
        }

        const addressData = await addressResponse.json();
        setAddress(addressData.address);
        setWalletData(addressData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchWalletData();
  }, [userId]);

  return (
    <WalletContext.Provider value={{ walletData, address, isLoading, error }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
