import { DynamicStructuredTool } from "@langchain/core/tools";
import { DatabaseService } from '@/lib/services/database';
import { StrategyScheduler } from '@/lib/strategies/scheduler';
import { executeStrategy } from '@/lib/strategies/executor';
import { z } from "zod";
import { Strategy } from "@/lib/strategies/types";

export const updateStrategyTool = () => {
  return new DynamicStructuredTool({
    name: "update_strategy",
    description: "Updates parameters of an existing strategy",
    schema: z.object({
      strategyId: z.string(),
      updates: z.object({
        tokenCount: z.number().min(1).max(10).optional(),
        totalAllocation: z.number().min(10).optional(),
        rebalanceTime: z.string().optional(),
        category: z.string().optional()
      })
    }),
    func: async ({ strategyId, updates }) => {
      try {
        const db = DatabaseService.getInstance();
        const strategy = await db.getStrategy(strategyId);

        if (!strategy) {
          return "Strategy not found";
        }

        // Update strategy parameters
        const updatedStrategy: Strategy = {
          ...strategy,
          parameters: {
            ...strategy.parameters,
            ...updates
          },
          last_updated: new Date().toISOString()
        };

        // Store updated strategy
        await db.storeStrategy(updatedStrategy);

        // Re-execute with new parameters if active
        if (updatedStrategy.status === 'ACTIVE') {
          await executeStrategy(updatedStrategy);
          await StrategyScheduler.getInstance().scheduleStrategy(updatedStrategy);
        }

        return `Strategy ${strategyId} updated successfully with new parameters: ${JSON.stringify(updates)}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return `Failed to update strategy: ${message}`;
      }
    }
  });
};
