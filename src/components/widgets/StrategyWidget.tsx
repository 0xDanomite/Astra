'use client'

import { motion } from 'framer-motion';
import { Clock, TrendingUp, Wallet, Loader2, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Strategy } from '@/lib/strategies/types';

// Demo data for fallback
const demoStrategy = {
  name: "Demo Strategy",
  type: "MARKET_CAP",
  nextRebalance: new Date(Date.now() + 3600000),
  holdings: [
    { symbol: "USDC", amount: 1000, value: 1000 },
    { symbol: "ETH", amount: 0.5, value: 900 },
    { symbol: "TOSHI", amount: 1000, value: 600 }
  ],
  totalValue: 2500
};

// Format date consistently
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
};

export function StrategyWidget() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchCurrentStrategy();
  }, []);

  async function fetchCurrentStrategy() {
    try {
      const response = await fetch('/api/strategy/current');
      if (response.ok) {
        const data = await response.json();
        setStrategy(data);
      }
    } catch (error) {
      console.error('Error fetching strategy:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatTimeLeft = (date: Date) => {
    const diff = new Date(date).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const displayStrategy = strategy || demoStrategy;
  const isDemo = !strategy && !loading;

  // Safe access to holdings with fallback
  const holdings = strategy?.current_holdings || [];
  const hasHoldings = holdings.length > 0;

  // Safe calculations with fallbacks
  const totalValue = holdings.reduce((sum, token) => sum + (token?.value || 0), 0);
  const initialValue = strategy?.parameters?.totalAllocation || 0;
  const pnlValue = totalValue - initialValue;
  const pnlPercentage = initialValue > 0 ? (pnlValue / initialValue) * 100 : 0;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-sm bg-deep-space/50 backdrop-blur-sm rounded-xl border border-stellar-blue/20 p-8 flex justify-center"
      >
        <Loader2 className="h-6 w-6 animate-spin text-stellar-blue" />
      </motion.div>
    );
  }

  if (!strategy) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-sm bg-deep-space/50 backdrop-blur-sm rounded-xl border border-stellar-blue/20 p-6"
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neural-white mb-2">No Active Strategy</h2>
          <p className="text-neural-white/70">Create a strategy to start trading</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-sm bg-deep-space/50 backdrop-blur-sm rounded-xl border border-stellar-blue/20"
    >
      {/* Header with status indicator */}
      <div className="p-4 border-b border-stellar-blue/20 flex justify-between items-center">
        <h2 className="font-space text-xl font-bold text-neural-white">
          Active Strategy
        </h2>
        {isDemo && (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300">
            Demo Mode
          </span>
        )}
        {error && (
          <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300">
            Offline
          </span>
        )}
      </div>

      {/* Strategy Info */}
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-neural-white/70">Type</span>
            <span className="text-neural-white font-mono">{strategy.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neural-white/70">Allocation</span>
            <span className="text-neural-white font-mono">
              ${strategy.parameters.totalAllocation} USDC
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neural-white/70">Token Count</span>
            <span className="text-neural-white font-mono">
              {strategy.parameters.tokenCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neural-white/70">Rebalance</span>
            <span className="text-neural-white font-mono">
              {strategy.parameters.rebalanceTime}
            </span>
          </div>
        </div>

        {hasHoldings && (
          <div className="mt-6">
            <h3 className="text-neural-white font-semibold mb-3">Current Holdings</h3>
            <div className="space-y-2">
              {holdings.map((holding, index) => (
                <div key={index} className="flex justify-between items-center bg-stellar-blue/10 p-2 rounded">
                  <span className="text-neural-white">{holding.symbol}</span>
                  <span className="text-neural-white/70 font-mono">
                    {holding.address.slice(0, 6)}...{holding.address.slice(-4)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total Value */}
        <div className="mt-6 p-4 rounded-lg" style={{
          background: 'linear-gradient(to right, #0EA5E9, #8B5CF6)'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-neural-white" />
              <span className="text-neural-white">Total Value</span>
            </div>
            <span className="font-space text-xl font-bold text-neural-white">
              ${totalValue.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg" style={{
          background: 'linear-gradient(to right, #0EA5E9, #8B5CF6)'
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-neural-white" />
              <span className="text-neural-white">PNL</span>
            </div>
            <div className="text-right">
              <span className="font-space text-xl font-bold text-neural-white">
                ${pnlValue.toFixed(2)}
              </span>
              <span className={`ml-2 text-sm ${pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ({pnlPercentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Add last update timestamp */}
      <div className="p-2 text-xs text-neural-white/50 text-center border-t border-stellar-blue/20">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </motion.div>
  );
}
