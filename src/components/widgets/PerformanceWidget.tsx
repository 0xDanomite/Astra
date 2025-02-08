'use client'

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Timer, Zap } from 'lucide-react';

interface PerformanceMetrics {
  totalValue: number;
  pnl: number;
  pnlPercentage: number;
  systemUptime: number;
  successRate: number;
  lastUpdate: Date;
}

// Mock data - will replace with real data later
const mockMetrics: PerformanceMetrics = {
  totalValue: 1000,
  pnl: 150,
  pnlPercentage: 15,
  systemUptime: 99.9,
  successRate: 98.5,
  lastUpdate: new Date(),
};

export function PerformanceWidget() {
  const isPnlPositive = mockMetrics.pnl >= 0;

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
        <div className="p-4 rounded-lg bg-cosmic-gradient">
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
              ${Math.abs(mockMetrics.pnl).toFixed(2)}
            </span>
            <span className={`text-sm ${isPnlPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPnlPositive ? '+' : '-'}{mockMetrics.pnlPercentage}%
            </span>
          </div>
        </div>

        {/* System Metrics */}
        <div className="space-y-4">
          {/* Uptime */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stellar-blue/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-stellar-blue" />
              <span className="text-neural-white/70">System Uptime</span>
            </div>
            <span className="font-mono text-neural-white">
              {mockMetrics.systemUptime}%
            </span>
          </div>

          {/* Success Rate */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stellar-blue/10">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-stellar-blue" />
              <span className="text-neural-white/70">Success Rate</span>
            </div>
            <span className="font-mono text-neural-white">
              {mockMetrics.successRate}%
            </span>
          </div>

          {/* Last Update */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-stellar-blue/10">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-stellar-blue" />
              <span className="text-neural-white/70">Last Update</span>
            </div>
            <span className="font-mono text-neural-white">
              {mockMetrics.lastUpdate.toLocaleTimeString()}
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
