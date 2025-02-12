import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { DatabaseService } from '@/lib/services/database';
import { Strategy } from '@/lib/strategies/types';
import { getBaseUrl } from '@/lib/utils/urls';

export const createStrategyTool = (userId: string) => {
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
      if (!userId) {
        throw new Error('User not authenticated');
      }

      try {
        console.log('Creating strategy with parameters:', { amount, category, tokenCount, rebalanceMinutes, type });

        // Create strategy object
        const strategy: Strategy = {
          id: crypto.randomUUID(),
          userId,
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

        // Store in database
        try {
          const db = DatabaseService.getInstance();
          await db.storeStrategy(strategy);
          console.log('Strategy stored in database');
        } catch (dbError) {
          console.error('Database error:', dbError);
          throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }

        // Call create endpoint
        try {
          const response = await fetch('/api/strategy/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parameters: strategy.parameters,
              userId
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${JSON.stringify(errorData)}`);
          }
          console.log('Strategy creation API call successful');
        } catch (apiError) {
          console.error('API call error:', apiError);
          throw new Error(`API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
        }

        return `Strategy created successfully!\nID: ${strategy.id}\nType: ${type}\nAllocation: ${amount} USDC`;
      } catch (error) {
        console.error('Strategy creation failed:', error);
        return `Failed to create strategy: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  });
};
