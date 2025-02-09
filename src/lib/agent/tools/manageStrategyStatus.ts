import { DynamicStructuredTool } from "@langchain/core/tools";
import { DatabaseService } from '@/lib/services/database';
import { StrategyScheduler } from '@/lib/strategies/scheduler';
import { z } from "zod";

export const manageStrategyStatusTool = () => {
  return new DynamicStructuredTool({
    name: "manage_strategy_status",
    description: "Pauses or resumes a strategy",
    schema: z.object({
      strategyId: z.string(),
      action: z.enum(['PAUSE', 'RESUME']),
      reason: z.string().optional()
    }),
    func: async ({ strategyId, action, reason }) => {
      try {
        const db = DatabaseService.getInstance();
        const strategy = await db.getStrategy(strategyId);

        if (!strategy) {
          return "Strategy not found";
        }

        // Update strategy status
        await db.updateStrategyStatus(strategyId, action === 'PAUSE' ? 'PAUSED' : 'ACTIVE');

        // Handle scheduling
        if (action === 'PAUSE') {
          await StrategyScheduler.getInstance().unscheduleStrategy(strategyId);
        } else {
          await StrategyScheduler.getInstance().scheduleStrategy(strategy);
        }

        return `Strategy ${strategyId} ${action.toLowerCase()}d successfully. ${reason ? `Reason: ${reason}` : ''}`;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return `Failed to ${action.toLowerCase()} strategy: ${message}`;
      }
    }
  });
};
