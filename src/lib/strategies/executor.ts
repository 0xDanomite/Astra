import { Strategy, TokenData } from './types';
import { DatabaseService } from '../services/database';
import { NillionService } from '../services/nillion';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { coingeckoService } from '../services/coingecko';

async function initializeWallet(userId: string) {
  // Reference from execute-trades/route.ts
  Coinbase.configure({
    apiKeyName: process.env.CDP_API_KEY_NAME!,
    privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
  });

  const nillionService = NillionService.getInstance();
  const walletData = await nillionService.getWalletData(userId);

  if (!walletData) {
    throw new Error('No wallet data found');
  }

  const wallet = await Wallet.import({
    walletId: walletData.walletId,
    seed: walletData.seed,
    networkId: walletData.networkId || 'base-sepolia'
  });

  return wallet;
}

function selectTokens(tokens: TokenData[], count: number, strategy: string): TokenData[] {
  const validTokens = tokens.filter(token =>
    token.address &&
    (strategy !== 'MARKET_CAP' || token.market_cap !== undefined) &&
    (strategy !== 'VOLUME' || token.total_volume !== undefined)
  );

  switch (strategy) {
    case 'RANDOM':
      const shuffled = [...validTokens].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);

    case 'MARKET_CAP':
      return [...validTokens]
        .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0))
        .slice(0, count);

    case 'VOLUME':
      return [...validTokens]
        .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0))
        .slice(0, count);

    default:
      throw new Error(`Unknown token selection strategy: ${strategy}`);
  }
}

export async function executeStrategy(strategy: Strategy) {
  try {
    console.log('Executing strategy:', {
      id: strategy.id,
      type: strategy.type,
      parameters: strategy.parameters
    });

    const db = DatabaseService.getInstance();
    const wallet = await initializeWallet(strategy.userId);

    const isInitialSetup = !strategy.current_holdings || strategy.current_holdings.length === 0;
    console.log('Trade type:', isInitialSetup ? 'Initial Setup' : 'Rebalance');

    if (isInitialSetup) {
      console.log('Fetching tokens for category:', strategy.parameters.category);
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
      console.log('Per token allocation:', perTokenAllocation, 'USDC');

      const tradeTimeout = 30000; // 30 seconds
      const trades = await Promise.all(selectedTokens.map(async (token) => {
        try {
          console.log(`Executing trade: ${perTokenAllocation} USDC -> ${token.symbol}`);
          const trade = await wallet.createTrade({
            amount: perTokenAllocation,
            fromAssetId: Coinbase.assets.Usdc,
            toAssetId: token.address,
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Trade timeout')), tradeTimeout)
          );

          await Promise.race([trade.wait(), timeoutPromise]);
          console.log(`Trade completed for ${token.symbol}`);
          return { token, status: 'SUCCESS' };
        } catch (error) {
          console.error(`Trade failed for ${token.symbol}:`, error);
          return { token, status: 'FAILED', error };
        }
      }));

      const successfulTrades = trades.filter(t => t.status === 'SUCCESS').map(t => t.token);
      strategy.current_holdings = successfulTrades;

      await db.storeStrategy({
        ...strategy,
        last_updated: new Date().toISOString()
      });

      return {
        success: true,
        holdings: successfulTrades,
        message: 'Initial setup completed successfully'
      };

    } else {
      const baseTokens = await coingeckoService.getTopTokensByCategory(
        strategy.parameters.category!,
        25
      );

      const newSelectedTokens = selectTokens(
        baseTokens,
        strategy.parameters.tokenCount,
        strategy.type
      );

      const tokensToSell = strategy.current_holdings.filter(
        currentToken => !newSelectedTokens.find(
          newToken => newToken.address === currentToken.address
        )
      );

      const tokensToBuy = newSelectedTokens.filter(
        newToken => !strategy.current_holdings.find(
          currentToken => currentToken.address === newToken.address
        )
      );

      // Execute sells
      for (const token of tokensToSell) {
        try {
          const balance = await wallet.getBalance(token.address);
          if (balance.toNumber() > 0) {
            const sellAmount = balance.toNumber() * 0.99; // 1% buffer for slippage
            const trade = await wallet.createTrade({
              amount: sellAmount,
              fromAssetId: token.address,
              toAssetId: Coinbase.assets.Usdc,
            });
            await trade.wait();
          }
        } catch (error) {
          console.error(`Failed to sell ${token.symbol}:`, error);
        }
      }

      // Remove sold tokens from holdings
      strategy.current_holdings = strategy.current_holdings.filter(
        token => !tokensToSell.find(t => t.address === token.address)
      );

      // Execute buys
      if (tokensToBuy.length > 0) {
        const usdcBalance = await wallet.getBalance(Coinbase.assets.Usdc);
        if (usdcBalance.toNumber() > 0) {
          const perTokenAllocation = usdcBalance.toNumber() / tokensToBuy.length;

          for (const token of tokensToBuy) {
            try {
              const trade = await wallet.createTrade({
                amount: perTokenAllocation,
                fromAssetId: Coinbase.assets.Usdc,
                toAssetId: token.address,
              });
              await trade.wait();
              strategy.current_holdings.push(token);
            } catch (error) {
              console.error(`Failed to buy ${token.symbol}:`, error);
            }
          }
        }
      }

      await db.storeStrategy({
        ...strategy,
        last_updated: new Date().toISOString()
      });

      return {
        success: true,
        holdings: strategy.current_holdings,
        message: 'Rebalancing completed successfully'
      };
    }
  } catch (error) {
    console.error('Strategy execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date()
    };
  }
}

