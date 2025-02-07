import { Strategy } from './types';
import { executeStrategy } from './executor';

export class StrategyScheduler {
  private static instance: StrategyScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private retryCount: Map<string, number> = new Map();
  private MAX_RETRIES = 1;

  private constructor() {}

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

    // Convert rebalanceTime to milliseconds (e.g., "5min" -> 300000ms)
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

  private parseRebalanceTime(time: string): number {
    const value = parseInt(time);
    if (time.includes('min')) return value * 60 * 1000;
    if (time.includes('hour')) return value * 60 * 60 * 1000;
    if (time.includes('day')) return value * 24 * 60 * 60 * 1000;
    return 5 * 60 * 1000; // Default to 5 minutes
  }
}
