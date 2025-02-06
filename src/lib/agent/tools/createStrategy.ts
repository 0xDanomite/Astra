import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const strategySchema = z.object({
  name: z.string(),
  type: z.enum(["MARKET_CAP", "VOLUME", "CUSTOM"]),
  category: z.string(),
  tokenCount: z.number(),
  rebalanceTime: z.string(),
  totalAllocation: z.number()
});

export const createStrategyTool = () => {
  return new DynamicStructuredTool({
    name: "create_strategy",
    description: "Creates a new trading strategy with the specified parameters",
    schema: strategySchema,
    func: async (params) => {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/strategy/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parameters: params })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      return `Strategy created successfully!
      ID: ${result.strategy.id}
      Type: ${result.strategy.type}
      Category: ${result.strategy.parameters.category}
      Rebalance: ${result.strategy.parameters.rebalanceTime}
      Tokens: ${result.strategy.parameters.tokenCount}
      Allocation: ${result.strategy.parameters.totalAllocation} USDC`;
    }
  });
};
