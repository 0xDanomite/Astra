import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { DatabaseService } from '@/lib/services/database';
import { Strategy } from '@/lib/strategies/types';
import { getBaseUrl } from '@/lib/utils/urls';

export const createStrategyTool = (userId: string) => {
  return new DynamicStructuredTool({
    name: "create_strategy",
    description: `Creates a trading strategy with specified parameters:
      - amount: USDC amount (min 10)
      - category: Token category (e.g., 'base-meme-coins' for meme tokens)
      - tokenCount: Number of tokens to hold (1-10)
      - rebalanceMinutes: Rebalance interval in minutes (recommended: 60, 120, 240, or 1440)
      - type: Strategy type ('RANDOM', 'MARKET_CAP', or 'VOLUME')
      - confirmed: Boolean to confirm creation`,
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

      if (!confirmed) {
        return "Please confirm the strategy creation by setting confirmed to true.";
      }

      try {
        console.log('Creating strategy with parameters:', { amount, category, tokenCount, rebalanceMinutes, type });

        // Create strategy object with shorter timeout
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

        // Store in database with timeout
        const dbPromise = new Promise(async (resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Database operation timed out')), 5000);
          try {
            const db = DatabaseService.getInstance();
            await db.storeStrategy(strategy);
            clearTimeout(timeoutId);
            resolve(true);
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });

        try {
          await dbPromise;
          console.log('Strategy stored in database');
        } catch (dbError) {
          console.error('Database error:', dbError);
          throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }

        // Call create endpoint with timeout
        const apiPromise = new Promise(async (resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('API operation timed out')), 5000);
          try {
            const response = await fetch('/api/strategy/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                parameters: {
                  ...strategy.parameters,
                  type: strategy.type
                },
                userId
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`API error: ${JSON.stringify(errorData)}`);
            }
            clearTimeout(timeoutId);
            resolve(true);
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });

        try {
          await apiPromise;
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
