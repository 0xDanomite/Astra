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
      if (!userId) {
        throw new Error('User not authenticated');
      }

      if (!confirmed) {
        return "Please confirm the strategy creation by setting confirmed to true.";
      }

      try {
        console.log('Creating strategy with parameters:', { amount, category, tokenCount, rebalanceMinutes, type });

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
        const db = DatabaseService.getInstance();
        await db.storeStrategy(strategy);
        console.log('Strategy stored in database');

        // Call create endpoint
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

        return `Strategy created successfully!\nID: ${strategy.id}\nType: ${type}\nAllocation: ${amount} USDC\nCategory: ${category}\nToken Count: ${tokenCount}\nRebalance Interval: ${rebalanceMinutes} minutes`;
      } catch (error) {
        console.error('Strategy creation failed:', error);
        throw new Error(`Failed to create strategy: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
};
