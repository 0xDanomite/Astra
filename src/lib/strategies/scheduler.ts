import { Strategy } from './types';
import { DatabaseService } from '../services/database';
import { executeStrategy } from './executor';
import { getBaseUrl } from '@/lib/utils/urls';

export class StrategyScheduler {
  private static instance: StrategyScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private retryCount: Map<string, number> = new Map();
  private MAX_RETRIES = 1;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  static getInstance(): StrategyScheduler {
    if (!this.instance) {
      this.instance = new StrategyScheduler();
    }
    return this.instance;
  }

  async scheduleStrategy(strategy: Strategy) {
    // Clear existing interval if any
    this.stopStrategy(strategy.id);
    this.retryCount.set(strategy.id, 0);

    // Convert rebalanceTime to milliseconds
    const interval = this.parseRebalanceTime(strategy.parameters.rebalanceTime || '5min');

    // Set up interval
    const timeoutId = setInterval(async () => {
      try {
        const retries = this.retryCount.get(strategy.id) || 0;
        if (retries >= this.MAX_RETRIES) {
          console.log(`Max retries reached for strategy ${strategy.id}, stopping rebalance`);
          this.stopStrategy(strategy.id);
          return;
        }

        console.log(`Executing strategy ${strategy.id}`);
        const result = await executeStrategy(strategy);

        if (!result.success) {
          this.retryCount.set(strategy.id, retries + 1);
          console.error(`Strategy execution failed: ${result.error}`);
        } else {
          // Reset retry count on success
          this.retryCount.set(strategy.id, 0);

          // Update strategy in database
          await this.db.storeStrategy({
            ...strategy,
            current_holdings: result.holdings || [],
            last_updated: new Date().toISOString()
          });
        }
      } catch (error) {
        const retries = this.retryCount.get(strategy.id) || 0;
        this.retryCount.set(strategy.id, retries + 1);
        console.error(`Strategy execution error: ${strategy.id}`, error);
      }
    }, interval);

    this.intervals.set(strategy.id, timeoutId);
    console.log(`Scheduled strategy ${strategy.id} to run every ${interval}ms`);
  }

  stopStrategy(strategyId: string) {
    const existingInterval = this.intervals.get(strategyId);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.intervals.delete(strategyId);
      this.retryCount.delete(strategyId);
      console.log(`Stopped strategy ${strategyId}`);
    }
  }

  // Alias for backward compatibility
  unscheduleStrategy(strategyId: string) {
    return this.stopStrategy(strategyId);
  }

  private parseRebalanceTime(time: string): number {
    const match = time.match(/(\d+)(min|hour|day)/);
    if (!match) return 5 * 60 * 1000; // Default to 5 minutes

    const [_, value, unit] = match;
    const interval = parseInt(value);

    switch (unit) {
      case 'min': return interval * 60 * 1000;
      case 'hour': return interval * 60 * 60 * 1000;
      case 'day': return interval * 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }

  async initializeScheduler(userId: string) {
    try {
      const activeStrategies = await this.db.getActiveStrategies(userId);
      for (const strategy of activeStrategies) {
        await this.scheduleStrategy(strategy);
      }
    } catch (error) {
      console.error('Failed to initialize scheduler:', error);
    }
  }
}
