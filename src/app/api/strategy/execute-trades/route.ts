import { NextResponse } from 'next/server';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { Strategy, TokenData } from '@/lib/strategies/types';
import { coingeckoService } from '@/lib/services/coingecko';
import { NillionService } from '@/lib/services/nillion';
import { DatabaseService } from '@/lib/services/database';

async function initializeWallet(userId: string) {
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

export async function POST(request: Request) {
  try {
    const { strategy } = await request.json();
    if (!strategy.userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const wallet = await initializeWallet(strategy.userId);
    const db = DatabaseService.getInstance();

    const isInitialSetup = !strategy.current_holdings || strategy.current_holdings.length === 0;

    if (isInitialSetup) {
      const baseTokens = await coingeckoService.getTopTokensByCategory(
        strategy.parameters.category!,
        25
      );

      console.log(`Found ${baseTokens.length} tokens for strategy execution`);

      const selectedTokens = selectTokens(
        baseTokens,
        strategy.parameters.tokenCount,
        strategy.type
      );

      const perTokenAllocation = strategy.parameters.totalAllocation / strategy.parameters.tokenCount;

      const trades = await Promise.all(selectedTokens.map(async (token) => {
        try {
          console.log(`Initial allocation: ${perTokenAllocation} USDC -> ${token.symbol} (${token.address})`);
          const trade = await wallet.createTrade({
            amount: perTokenAllocation,
            fromAssetId: Coinbase.assets.Usdc,
            toAssetId: token.address,
          });
          await trade.wait();
          return { token, status: 'SUCCESS' };
        } catch (error) {
          console.error(`Trade failed for ${token.symbol}:`, error);
          return { token, status: 'FAILED', error };
        }
      }));

      const successfulTrades = trades.filter(t => t.status === 'SUCCESS').map(t => t.token);
      strategy.current_holdings = successfulTrades;

      // Update strategy in database
      await db.storeStrategy({
        ...strategy,
        last_updated: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        holdings: successfulTrades,
        message: 'Initial setup completed successfully'
      });

    } else {
      // Rebalancing logic
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

      // Update strategy in database
      await db.storeStrategy({
        ...strategy,
        last_updated: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        holdings: strategy.current_holdings,
        message: 'Rebalancing completed successfully'
      });
    }
  } catch (error) {
    console.error('Trade execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute trades', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

type TokenSelectionStrategy = 'RANDOM' | 'MARKET_CAP' | 'VOLUME';

function selectTokens(tokens: TokenData[], count: number, strategy: TokenSelectionStrategy): TokenData[] {
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

