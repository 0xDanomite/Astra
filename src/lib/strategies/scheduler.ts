import { Strategy } from './types';
import { DatabaseService } from '../services/database';
import { executeStrategy } from './executor';

export class StrategyScheduler {
  private static instance: StrategyScheduler;
  private db: DatabaseService;
  private timer: NodeJS.Timeout | null = null;
  private isAppSchedulerEnabled = process.env.NEXT_PUBLIC_USE_APP_SCHEDULER === 'true';

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): StrategyScheduler {
    if (!StrategyScheduler.instance) {
      StrategyScheduler.instance = new StrategyScheduler();
    }
    return StrategyScheduler.instance;
  }

  async scheduleStrategy(strategy: Strategy): Promise<void> {
    await this.db.storeStrategy(strategy);
    console.log(`📅 Registered strategy ${strategy.id} for rebalancing: ${strategy.parameters.rebalanceTime}`);

    if (this.isAppSchedulerEnabled) {
      this.startScheduler();
    }
  }

  async unscheduleStrategy(strategyId: string): Promise<void> {
    await this.db.removeStrategy(strategyId);
    console.log(`❌ Unregistered strategy ${strategyId}`);

    if (this.isAppSchedulerEnabled) {
      this.stopScheduler();
    }
  }

  private async checkAndRebalance() {
    try {
      const activeStrategies = await this.db.getActiveStrategies();
      const now = new Date();

      // Only process the most recent active strategy
      const strategy = activeStrategies[0];
      if (!strategy) return;

      const rebalanceTime = strategy.parameters.rebalanceTime;
      const lastRebalanceDate = strategy.last_updated || strategy.created_at
        ? new Date(strategy.last_updated || strategy.created_at || '')
        : new Date();

      if (this.isRebalanceNeeded(lastRebalanceDate, rebalanceTime || '1day', now)) {
        console.log(`⚖️ Rebalancing strategy ${strategy.id}`);
        await executeStrategy(strategy);
      }
    } catch (error) {
      console.error('Rebalance check failed:', error);
    }
  }

  private isRebalanceNeeded(lastRebalance: Date, rebalanceTime: string, now: Date): boolean {
    const match = rebalanceTime.match(/(\d+)(min|hour|day|week|month)/);
    if (!match) return false;

    const [_, value, unit] = match;
    const interval = parseInt(value);
    const diffMinutes = (now.getTime() - lastRebalance.getTime()) / (60 * 1000);

    switch (unit) {
      case 'min':
        return diffMinutes >= interval;
      case 'hour':
        return diffMinutes >= interval * 60;
      case 'day':
        return diffMinutes >= interval * 60 * 24;
      case 'week':
        return diffMinutes >= interval * 60 * 24 * 7;
      case 'month':
        return diffMinutes >= interval * 60 * 24 * 30;
      default:
        return false;
    }
  }

  private startScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    // Check every minute
    this.timer = setInterval(() => this.checkAndRebalance(), 60 * 1000);
    console.log('📊 App-side scheduler started');
  }

  private stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('⏹️ App-side scheduler stopped');
    }
  }

  // Call this when app initializes
  public initializeScheduler() {
    if (this.isAppSchedulerEnabled) {
      this.startScheduler();
    }
  }
}
