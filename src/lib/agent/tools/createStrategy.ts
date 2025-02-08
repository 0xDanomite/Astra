import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { executeStrategy } from "@/lib/strategies/executor";
import { StrategyScheduler } from "@/lib/strategies/scheduler";

interface StrategyToolConfig {
  validateParameters?: boolean;
  requireConfirmation?: boolean;
  persistStrategy?: boolean;
}

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
        const strategy = {
          id: crypto.randomUUID(),
          type,
          parameters: {
            totalAllocation: amount,
            category,
            tokenCount,
            rebalanceTime: `${rebalanceMinutes}min`
          },
          currentHoldings: []
        };

        await executeStrategy(strategy);
        await StrategyScheduler.getInstance().scheduleStrategy(strategy);

        return `Strategy created! ID: ${strategy.id}\nType: ${type}\nAllocation: ${amount} USDC\nCategory: ${category}\nRebalance: ${rebalanceMinutes}min`;
      } catch (error) {
        return `Failed to create strategy: ${error.message}`;
      }
    }
  });
};
