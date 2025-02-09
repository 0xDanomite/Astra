import { DynamicStructuredTool } from "@langchain/core/tools";
import { DatabaseService } from '@/lib/services/database';
import { z } from 'zod';

export const getStrategyPerformanceTool = () => {
  return new DynamicStructuredTool({
    name: "get_strategy_performance",
    description: "Gets detailed performance metrics for a specific strategy",
    schema: z.object({
      strategyId: z.string()
    }),
    func: async ({ strategyId }) => {
      const db = DatabaseService.getInstance();
      const strategy = await db.getStrategy(strategyId);
      if (!strategy) {
        return "Strategy not found";
      }

      // Calculate performance metrics
      const initialValue = strategy.parameters.totalAllocation;
      const currentValue = strategy.current_holdings?.reduce((sum, token) => sum + (token.value || 0), 0) || 0;
      const roi = ((currentValue - initialValue) / initialValue) * 100;

      // Ensure consistent date format
      const lastRebalanceISO = strategy.last_updated
        ? new Date(strategy.last_updated).toISOString()
        : new Date().toISOString();

      return {
        strategyId,
        type: strategy.type,
        initialValue,
        currentValue,
        roi: `${roi.toFixed(2)}%`,
        lastRebalance: lastRebalanceISO,
        holdings: strategy.current_holdings || []
      };
    }
  });
};
