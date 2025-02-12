'use client'

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Timer, Zap, Network } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

interface PerformanceMetrics {
  totalValue: number;
  pnl: number;
  pnlPercentage: number;
  systemUptime: number;
  successRate: number;
  lastUpdate: string;
}

interface WalletInfo {
  address: string;
  network: string;
}

// Example date formatting
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

export function PerformanceWidget() {
  const { userId } = useAuth();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalValue: 0,
    pnl: 0,
    pnlPercentage: 0,
    systemUptime: 100,
    successRate: 100,
    lastUpdate: new Date().toISOString()
  });

  const [networkInfo, setNetworkInfo] = useState<string>('Loading...');

  useEffect(() => {
    // Fetch wallet info for network
    async function fetchWalletInfo() {
      if (!userId) return;

      try {
        const response = await fetch(`/api/wallet/address?userId=${userId}`);
        if (response.ok) {
          const data: WalletInfo = await response.json();
          setNetworkInfo(data.network);
        }
      } catch (error) {
        console.error('Failed to fetch wallet info:', error);
        setNetworkInfo('Network Error');
      }
    }

    // Fetch performance metrics
    async function fetchPerformanceData() {
      try {
        const response = await fetch('/api/strategy/performance');
        if (response.ok) {
          const data = await response.json();
          setMetrics({
            ...data,
            lastUpdate: new Date(data.lastUpdate).toISOString()
          });
        }
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      }
    }

    // Initial fetches
    fetchWalletInfo();
    fetchPerformanceData();

    // Subscribe to updates
    const eventSource = new EventSource('/api/strategy/updates');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'HOLDINGS_UPDATED') {
        fetchPerformanceData();
      }
    };

    return () => eventSource.close();
  }, []);

  const isPnlPositive = metrics.pnl >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-sm bg-deep-space/50 backdrop-blur-sm rounded-xl border border-stellar-blue/20"
    >
      {/* Header */}
      <div className="p-4 border-b border-stellar-blue/20">
        <h2 className="font-space text-xl font-bold text-neural-white">
          Performance Monitor
        </h2>
      </div>

      {/* Main Stats */}
      <div className="p-4 space-y-6">
        {/* PNL Card */}
        <div className="p-4 rounded-lg" style={{
          background: 'linear-gradient(to right, #0EA5E9, #8B5CF6)'
        }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-neural-white/80">Total P&L</span>
            {isPnlPositive ? (
              <TrendingUp className="w-5 h-5 text-neural-white" />
            ) : (
              <TrendingDown className="w-5 h-5 text-neural-white" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-space text-2xl font-bold text-neural-white">
              ${Math.abs(metrics.pnl).toFixed(2)}
            </span>
            <span className={`text-sm ${isPnlPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPnlPositive ? '+' : '-'}{metrics.pnlPercentage}%
            </span>
          </div>
        </div>

        {/* System Metrics */}
        <div className="space-y-4">
          {/* Network Info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stellar-blue/10">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-stellar-blue" />
              <span className="text-neural-white/70">Network</span>
            </div>
            <span className="font-mono text-neural-white">
              {networkInfo}
            </span>
          </div>

          {/* Uptime */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stellar-blue/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-stellar-blue" />
              <span className="text-neural-white/70">System Uptime</span>
            </div>
            <span className="font-mono text-neural-white">
              {metrics.systemUptime}%
            </span>
          </div>

          {/* Success Rate */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stellar-blue/10">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-stellar-blue" />
              <span className="text-neural-white/70">Success Rate</span>
            </div>
            <span className="font-mono text-neural-white">
              {metrics.successRate}%
            </span>
          </div>

          {/* Last Update */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stellar-blue/10">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-stellar-blue" />
              <span className="text-neural-white/70">Last Update</span>
            </div>
            <span className="font-mono text-neural-white">
              {metrics.lastUpdate ? formatDate(metrics.lastUpdate) : 'Never'}
            </span>
          </div>
        </div>

        {/* Mini Chart - Placeholder for now */}
        <div className="h-32 rounded-lg bg-stellar-blue/10 flex items-center justify-center">
          <span className="text-neural-white/50">Chart Coming Soon</span>
        </div>
      </div>
    </motion.div>
  );
}
