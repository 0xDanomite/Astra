'use client'

import { motion } from 'framer-motion';
import { Clock, TrendingUp, Wallet } from 'lucide-react';

interface TokenHolding {
  symbol: string;
  amount: number;
  value: number;
}

interface StrategyInfo {
  name: string;
  type: 'RANDOM' | 'MARKET_CAP' | 'VOLUME';
  nextRebalance: Date;
  holdings: TokenHolding[];
  totalValue: number;
}

// Temporary mock data - replace with real data later
const mockStrategy: StrategyInfo = {
  name: "Meme Coin Strategy",
  type: "RANDOM",
  nextRebalance: new Date(Date.now() + 3600000), // 1 hour from now
  holdings: [
    { symbol: "PEPE", amount: 1000000, value: 500 },
    { symbol: "WOJAK", amount: 50000, value: 300 },
    { symbol: "DOGE", amount: 1000, value: 200 },
  ],
  totalValue: 1000,
};

export function StrategyWidget() {
  const formatTimeLeft = (date: Date) => {
    const diff = date.getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-sm bg-deep-space/50 backdrop-blur-sm rounded-xl border border-stellar-blue/20"
    >
      {/* Header */}
      <div className="p-4 border-b border-stellar-blue/20">
        <h2 className="font-space text-xl font-bold text-neural-white">
          Active Strategy
        </h2>
      </div>

      {/* Strategy Info */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-neural-white/70">Strategy Name</span>
          <span className="font-space text-neural-white">{mockStrategy.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neural-white/70">Type</span>
          <span className="px-2 py-1 rounded-full bg-stellar-blue/20 text-stellar-blue text-sm">
            {mockStrategy.type}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-neural-white/70">Next Rebalance</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cosmic-purple" />
            <span className="text-neural-white">
              {formatTimeLeft(mockStrategy.nextRebalance)}
            </span>
          </div>
        </div>

        {/* Holdings */}
        <div className="mt-6">
          <h3 className="text-neural-white/70 mb-3">Current Holdings</h3>
          <div className="space-y-2">
            {mockStrategy.holdings.map((token, i) => (
              <motion.div
                key={token.symbol}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-2 rounded-lg bg-stellar-blue/10"
              >
                <span className="text-neural-white">{token.symbol}</span>
                <span className="text-neural-white">${token.value.toFixed(2)}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Total Value */}
        <div className="mt-6 p-4 rounded-lg bg-cosmic-gradient">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-neural-white" />
              <span className="text-neural-white">Total Value</span>
            </div>
            <span className="font-space text-xl font-bold text-neural-white">
              ${mockStrategy.totalValue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
