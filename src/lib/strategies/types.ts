export interface Strategy {
  id: string;
  name: string;
  type: 'MARKET_CAP' | 'VOLUME' | 'CUSTOM';
  owner: {
    address: string;    // Creator's wallet address
    createdAt: Date;
  };
  parameters: {
    category?: string;
    rebalanceTime?: string; // "17:00"
    timeZone?: string;     // User's timezone
    tokenCount: number;
    totalAllocation: number; // Total USDC to invest
  };
  agentWallet: {
    address: string;    // Agent's CDP wallet address
    createdAt: Date;
  };
  currentHoldings: TokenData[];
  lastRebalance: Date;
}

export interface TokenData {
  symbol: string;
  name: string;
  marketCap?: number;
  platforms?: Record<string, string>;
  address?: string;
}
