'use server'

import { Strategy, TokenData } from './types';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { coingeckoService } from '../services/coingecko';
import { NillionService } from '../services/nillion';
import { DatabaseService } from '../services/database';

function selectTokens(tokens: TokenData[], count: number, strategy: string): TokenData[] {
  if (strategy === 'RANDOM') {
    return tokens.sort(() => Math.random() - 0.5).slice(0, count);
  }
  // Add other strategy types here
  return tokens.slice(0, count);
}

export async function executeStrategy(strategy: Strategy) {
  try {
    console.log('Executing strategy:', {
      id: strategy.id,
      type: strategy.type,
      parameters: strategy.parameters
    });

    if (!strategy.userId) {
      throw new Error('User ID is required');
    }

    // Initialize services
    const nillionService = NillionService.getInstance();
    const db = DatabaseService.getInstance();

    // Configure CDP
    Coinbase.configure({
      apiKeyName: process.env.CDP_API_KEY_NAME!,
      privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
    });

    // Get wallet data
    const walletData = await nillionService.getWalletData(strategy.userId);
    if (!walletData) {
      throw new Error('No wallet data found');
    }

    // Import wallet
    const wallet = await Wallet.import({
      walletId: walletData.walletId,
      seed: walletData.seed,
      networkId: walletData.networkId || 'base-sepolia'
    });

    const isInitialSetup = !strategy.current_holdings || strategy.current_holdings.length === 0;

    if (isInitialSetup) {
      const baseTokens = await coingeckoService.getTopTokensByCategory(
        strategy.parameters.category!,
        25
      );

      const selectedTokens = selectTokens(
        baseTokens,
        strategy.parameters.tokenCount,
        strategy.type
      );

      const perTokenAllocation = strategy.parameters.totalAllocation / strategy.parameters.tokenCount;

      // Execute trades with timeout
      const tradeTimeout = 30000;
      const trades = await Promise.all(selectedTokens.map(async (token) => {
        try {
          const trade = await wallet.createTrade({
            amount: perTokenAllocation,
            fromAssetId: Coinbase.assets.Usdc,
            toAssetId: token.address,
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Trade timeout')), tradeTimeout)
          );

          await Promise.race([trade.wait(), timeoutPromise]);
          return { token, status: 'SUCCESS' };
        } catch (error) {
          console.error(`Trade failed for ${token.symbol}:`, error);
          return { token, status: 'FAILED', error };
        }
      }));

      const successfulTrades = trades.filter(t => t.status === 'SUCCESS').map(t => t.token);

      // Update strategy in database
      await db.storeStrategy({
        ...strategy,
        current_holdings: successfulTrades,
        last_updated: new Date().toISOString()
      });

      return {
        success: true,
        holdings: successfulTrades,
        message: 'Initial setup completed successfully'
      };
    }

    // Rebalancing logic
    const baseTokens = await coingeckoService.getTopTokensByCategory(
      strategy.parameters.category!,
      25
    );

    const selectedTokens = selectTokens(
      baseTokens,
      strategy.parameters.tokenCount,
      strategy.type
    );

    // Calculate current holdings value and new allocations
    const currentHoldings = strategy.current_holdings;
    const targetAllocation = strategy.parameters.totalAllocation / strategy.parameters.tokenCount;

    // Execute rebalancing trades
    const rebalancingTrades = await Promise.all(
      selectedTokens.map(async (token) => {
        try {
          const existingHolding = currentHoldings.find(h => h.address === token.address);

          if (!existingHolding) {
            // Buy new token
            const trade = await wallet.createTrade({
              amount: targetAllocation,
              fromAssetId: Coinbase.assets.Usdc,
              toAssetId: token.address,
            });
            await trade.wait();
            return { token, status: 'SUCCESS' };
          }

          // TODO: Add logic for rebalancing existing holdings
          // This would involve comparing current value vs target allocation
          // and executing trades to adjust positions

          return { token, status: 'SUCCESS' };
        } catch (error) {
          console.error(`Rebalancing failed for ${token.symbol}:`, error);
          return { token, status: 'FAILED', error };
        }
      })
    );

    const successfulRebalances = rebalancingTrades
      .filter(t => t.status === 'SUCCESS')
      .map(t => t.token);

    // Update strategy with new holdings
    await db.storeStrategy({
      ...strategy,
      current_holdings: successfulRebalances,
      last_updated: new Date().toISOString()
    });

    return {
      success: true,
      holdings: strategy.current_holdings,
      message: 'Strategy executed successfully'
    };
  } catch (error) {
    console.error('Strategy execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date()
    };
  }
}

