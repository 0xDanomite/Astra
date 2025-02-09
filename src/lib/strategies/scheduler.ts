import { Strategy } from './types';
import { DatabaseService } from '../services/database';

export class StrategyScheduler {
  private static instance: StrategyScheduler;
  private db: DatabaseService;

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
    // Just store the strategy with its rebalance time
    // The cron job will handle the actual scheduling
    await this.db.storeStrategy(strategy);
    console.log(`📅 Registered strategy ${strategy.id} for rebalancing: ${strategy.parameters.rebalanceTime}`);
  }

  async unscheduleStrategy(strategyId: string): Promise<void> {
    // Remove strategy from database
    await this.db.removeStrategy(strategyId);
    console.log(`❌ Unregistered strategy ${strategyId}`);
  }
}
