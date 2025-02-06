import { Strategy } from './types';
import { executeStrategy } from './executor';
import { initializeAgent } from '../agent/chatbot';

export class StrategyScheduler {
  private static instance: StrategyScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();

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

    // Convert rebalanceTime to milliseconds (e.g., "5min" -> 300000ms)
    const interval = this.parseRebalanceTime(strategy.parameters.rebalanceTime || '5min');

    // Initialize agentkit for execution
    const { agentkit } = await initializeAgent();

    // Set up interval
    const timeoutId = setInterval(async () => {
      try {
        console.log(`Executing strategy ${strategy.id}`);
        await executeStrategy(strategy, agentkit);
      } catch (error) {
        console.error(`Strategy execution failed: ${strategy.id}`, error);
      }
    }, interval);

    this.intervals.set(strategy.id, timeoutId);
  }

  stopStrategy(strategyId: string) {
    const existingInterval = this.intervals.get(strategyId);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.intervals.delete(strategyId);
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
