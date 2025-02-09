import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { DatabaseService } from '@/lib/services/database';
import { Strategy } from '@/lib/strategies/types';

export const createStrategyTool = () => {
  return new DynamicStructuredTool({
    name: "create_strategy",
    description: "Creates a trading strategy with specified parameters",
    schema: z.object({
      amount: z.number().min(10),
      category: z.string(),
      tokenCount: z.number().min(1).max(10),
      rebalanceMinutes: z.number(),
      type: z.enum(['RANDOM', 'MARKET_CAP', 'VOLUME']),
      confirmed: z.boolean()
    }),
    func: async ({ amount, category, tokenCount, rebalanceMinutes, type, confirmed }) => {
      try {
        const strategy: Strategy = {
          id: crypto.randomUUID(),
          type,
          parameters: {
            totalAllocation: amount,
            category,
            tokenCount,
            rebalanceTime: `${rebalanceMinutes}min`
          },
          current_holdings: [],
          status: 'ACTIVE' as const,
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        };

        const db = DatabaseService.getInstance();
        await db.storeStrategy(strategy);

        return `Strategy created successfully!\nID: ${strategy.id}\nType: ${type}\nAllocation: ${amount} USDC`;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to create strategy: ${message}`);
      }
    }
  });
};
