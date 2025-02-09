'use client'

import { createContext, useContext, useEffect, useState } from 'react';

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
  const [walletData, setWalletData] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeWallet() {
      try {
        const response = await fetch('/api/wallet/init', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to initialize wallet');
        }

        const data = await response.json();
        if (data.success) {
          setWalletData(data);
          setAddress(data.address);
        } else {
          throw new Error(data.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    initializeWallet();
  }, []);

  return (
    <WalletContext.Provider value={{ walletData, address, isLoading, error }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
