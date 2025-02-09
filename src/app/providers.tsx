'use client';

import { PrivyProvider } from '@privy-io/react-auth';

export function Providers({ children }: { children: React.ReactNode }) {

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
        defaultChain: {
          id: 8453,
          name: 'Base',
          nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: {
            default: {
              http: ['https://mainnet.base.org'],
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
