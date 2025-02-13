import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { DatabaseService } from '@/lib/services/database';
import { Strategy } from '@/lib/strategies/types';
import { StrategyScheduler } from '@/lib/strategies/scheduler';
import { executeStrategy } from '@/lib/strategies/executor';

export const createStrategyTool = (userId: string) => {
  return new DynamicStructuredTool({
    name: "create_strategy",
    description: `Creates a trading strategy with specified parameters:
      - amount: USDC amount (min 10)
      - category: Token category (e.g., 'base-meme-coins' for meme tokens)
      - tokenCount: Number of tokens to hold (1-10)
      - rebalanceMinutes: Rebalance interval in minutes (recommended: 60, 120, 240, or 1440)
      - type: Strategy type ('RANDOM', 'MARKET_CAP', or 'VOLUME')
      - confirmed: Boolean to confirm creation

      EXAMPLE:
      {
        "amount": 20,
        "category": "base-meme-coins",
        "tokenCount": 2,
        "rebalanceMinutes": 60,
        "type": "RANDOM",
        "confirmed": true
      }`,
    schema: z.object({
      amount: z.number().min(10),
      category: z.string(),
      tokenCount: z.number().min(1).max(10),
      rebalanceMinutes: z.number(),
      type: z.enum(['RANDOM', 'MARKET_CAP', 'VOLUME']),
      confirmed: z.boolean()
    }),
    func: async ({ amount, category, tokenCount, rebalanceMinutes, type, confirmed }) => {
      if (!userId || !confirmed) {
        return "Please confirm the strategy creation.";
      }

      try {
        console.log('Creating strategy with parameters:', {
          amount, category, tokenCount, rebalanceMinutes, type
        });

        const strategy: Strategy = {
          id: crypto.randomUUID(),
          userId,
          type,
          parameters: {
            totalAllocation: amount,
            category: category || 'base-meme-coins',
            tokenCount,
            rebalanceTime: `${rebalanceMinutes}min`
          },
          current_holdings: [],
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        };

        const db = DatabaseService.getInstance();
        await db.storeStrategy(strategy);

        // Execute initial trades
        console.log('Executing initial trades...');
        const result = await executeStrategy(strategy);

        if (!result.success) {
          console.error('Initial trade execution failed:', result.error);
        }

        // Schedule the strategy
        console.log('Scheduling strategy...');
        const scheduler = StrategyScheduler.getInstance();
        await scheduler.scheduleStrategy(strategy);

        return `Strategy created successfully!\nID: ${strategy.id}\nType: ${type}\nAllocation: ${amount} USDC\nRebalance Interval: ${rebalanceMinutes} minutes`;
      } catch (error) {
        console.error('Strategy creation failed:', error);
        throw error;
      }
    }
  });
};
