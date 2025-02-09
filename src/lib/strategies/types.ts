export interface Strategy {
  id: string;
  type: 'MARKET_CAP' | 'VOLUME' | 'RANDOM';
  status: 'ACTIVE' | 'PAUSED';
  parameters: {
    category?: string;
    rebalanceTime?: string | null;
    tokenCount: number;
    totalAllocation: number;
    walletAddress?: string;
  };
  current_holdings: TokenData[];
  created_at?: string;
  last_updated?: string;
}

export interface TokenData {
  id?: string;
  symbol: string;
  address: string;
  market_cap?: number;
  total_volume?: number;
  value?: number;
  amount?: number;
}
