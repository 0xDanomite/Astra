import { Strategy, TokenData } from './types';
import { coingeckoService } from '../services/coingecko';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import * as fs from 'fs';
import { CdpWalletProvider } from '@coinbase/coinbase-sdk';
import { initializeWallet } from "@/lib/wallet";

const WALLET_DATA_FILE = "wallet_data.txt";

type TokenSelectionStrategy = 'RANDOM' | 'MARKET_CAP' | 'VOLUME';

function selectTokens(tokens: TokenData[], count: number, strategy: TokenSelectionStrategy): TokenData[] {
  // Filter out tokens with missing required data first
  const validTokens = tokens.filter(token =>
    token.address &&
    (strategy !== 'MARKET_CAP' || token.market_cap !== undefined) &&
    (strategy !== 'VOLUME' || token.total_volume !== undefined)
  );

  console.log(`Valid tokens for ${strategy} strategy:`,
    validTokens.map(t => ({
      symbol: t.symbol,
      address: t.address,
      market_cap: t.market_cap,
      volume: t.total_volume
    }))
  );

  switch (strategy) {
    case 'RANDOM':
      // Shuffle array and take first n elements
      const shuffled = [...validTokens].sort(() => Math.random() - 0.5);
      console.log('Randomly selected from:', shuffled.map(t => t.symbol).join(', '));
      return shuffled.slice(0, count);

    case 'MARKET_CAP':
      const byMarketCap = [...validTokens]
        .sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
      console.log('Sorted by market cap:', byMarketCap.map(t => `${t.symbol} (${t.market_cap})`).join(', '));
      return byMarketCap.slice(0, count);

    case 'VOLUME':
      const byVolume = [...validTokens]
        .sort((a, b) => (b.total_volume || 0) - (a.total_volume || 0));
      console.log('Sorted by volume:', byVolume.map(t => `${t.symbol} (${t.total_volume})`).join(', '));
      return byVolume.slice(0, count);

    default:
      throw new Error(`Unknown token selection strategy: ${strategy}`);
  }
}

// Rebalance - includes sells if needed
async function rebalance(strategy: Strategy, currentHoldings: TokenData[]) {
  const allTokens = await coingeckoService.getTopTokensByCategory(
    strategy.parameters.category || 'base-meme-coins',
    25
  );

  // Calculate which tokens to sell and buy
  const tokensToSell = currentHoldings.filter(
    holding => !allTokens.find(top => top.symbol === holding.symbol)
  );
  const tokensToBuy = allTokens.filter(
    top => !currentHoldings.find(holding => holding.symbol === top.symbol)
  );

  return { tokensToSell, tokensToBuy, perTokenAllocation: strategy.parameters.totalAllocation / strategy.parameters.tokenCount };
}

export async function executeStrategy(strategy: Strategy) {
  try {
    let wallet = await initializeWallet();
    const isInitialSetup = !strategy.currentHoldings || strategy.currentHoldings.length === 0;

    if (isInitialSetup) {
      const baseTokens = await coingeckoService.getTopTokensByCategory(
        strategy.parameters.category!,
        25
      );

      console.log(`Found ${baseTokens.length} tokens on Base with data:`,
        baseTokens.map(t => ({
          symbol: t.symbol,
          market_cap: t.market_cap,
          volume: t.total_volume
        }))
      );

      console.log('TYPE', strategy.type);
      const selectedTokens = selectTokens(
        baseTokens,
        strategy.parameters.tokenCount,
        strategy.type as TokenSelectionStrategy
      );

      console.log('Selected tokens for trading:',
        selectedTokens.map(t =>
          `${t.symbol} (${t.address}) - MC: ${t.market_cap}, Vol: ${t.total_volume}`
        )
      );

      const perTokenAllocation = strategy.parameters.totalAllocation / strategy.parameters.tokenCount;

      const trades = await Promise.all(selectedTokens.map(async (token) => {
        try {
          console.log(`Initial allocation: ${perTokenAllocation} USDC -> ${token.symbol} (${token.address})`);
          const trade = await wallet.createTrade({
            amount: perTokenAllocation,
            fromAssetId: Coinbase.assets.Usdc,
            toAssetId: token.address,
            gasless: true
          });
          await trade.wait();
          return { token, status: 'SUCCESS' };
        } catch (error) {
          console.error(`Trade failed for ${token.symbol} (${token.address}):`, error);
          return { token, status: 'FAILED', error };
        }
      }));

      strategy.currentHoldings = trades
        .filter(t => t.status === 'SUCCESS')
        .map(t => t.token);

      console.log('Stored holdings:', strategy.currentHoldings);
    } else {
      // Rebalancing with optimization
      const baseTokens = await coingeckoService.getTopTokensByCategory(
        strategy.parameters.category!,
        25
      );

      // Select new tokens using strategy
      const newSelectedTokens = selectTokens(
        baseTokens,
        strategy.parameters.tokenCount,
        strategy.type as TokenSelectionStrategy
      );

      // Compare current holdings with new selection
      const tokensToSell = strategy.currentHoldings.filter(
        currentToken => !newSelectedTokens.find(
          newToken => newToken.address === currentToken.address
        )
      );

      const tokensToBuy = newSelectedTokens.filter(
        newToken => !strategy.currentHoldings.find(
          currentToken => currentToken.address === newToken.address
        )
      );

      console.log('Rebalance analysis:', {
        currentHoldings: strategy.currentHoldings.map(t => t.symbol),
        newSelection: newSelectedTokens.map(t => t.symbol),
        toSell: tokensToSell.map(t => t.symbol),
        toBuy: tokensToBuy.map(t => t.symbol)
      });

      if (tokensToSell.length === 0 && tokensToBuy.length === 0) {
        console.log('No rebalancing needed - current holdings match optimal selection');
        return {
          success: true,
          holdings: strategy.currentHoldings,
          message: 'Holdings already optimal'
        };
      }

      // Sell only tokens that aren't in new selection
      wallet = await initializeWallet();
      for (const token of tokensToSell) {
        try {
          const balance = await wallet.getBalance(token.address);
          console.log(`Balance for ${token.symbol} (${token.address}): ${balance}`);

          if (balance > 0) {
            const sellAmount = balance * 0.99;
            console.log(`Selling ${sellAmount} of ${token.symbol}`);

            wallet = await initializeWallet();
            const trade = await wallet.createTrade({
              amount: sellAmount,
              fromAssetId: token.address,
              toAssetId: Coinbase.assets.Usdc,
              gasless: true,
              slippageTolerance: 0.02
            });
            await trade.wait();
          }
        } catch (error) {
          console.error(`Failed to sell ${token.symbol}:`, error);
        }
      }

      // Remove sold tokens from holdings
      strategy.currentHoldings = strategy.currentHoldings.filter(
        token => !tokensToSell.find(t => t.address === token.address)
      );

      // Buy only new tokens
      if (tokensToBuy.length > 0) {
        const usdcBalance = await wallet.getBalance(Coinbase.assets.Usdc);
        if (usdcBalance > 0) {
          const perTokenAllocation = usdcBalance / tokensToBuy.length;

          for (const token of tokensToBuy) {
            try {
              console.log(`Buying ${token.symbol} with ${perTokenAllocation} USDC`);
              const trade = await wallet.createTrade({
                amount: perTokenAllocation,
                fromAssetId: Coinbase.assets.Usdc,
                toAssetId: token.address,
                gasless: true,
                slippageTolerance: 0.02
              });
              await trade.wait();
              strategy.currentHoldings.push(token);
            } catch (error) {
              console.error(`Failed to buy ${token.symbol}:`, error);
            }
          }
        }
      }
    }

    strategy.lastRebalance = new Date();
    return {
      success: true,
      holdings: strategy.currentHoldings,
      message: 'Rebalancing completed'
    };
  } catch (error) {
    console.error('Strategy execution error:', error);
    return { success: false, error: error.message };
  }
}

async function calculateRebalancingNeeds(
  currentHoldings: TokenData[],
  newTopTokens: TokenData[],
  targetCount: number
) {
  const tokensToSell = currentHoldings.filter(
    holding => !newTopTokens.slice(0, targetCount).find(t => t.symbol === holding.symbol)
  );

  const tokensToBuy = newTopTokens
    .slice(0, targetCount)
    .filter(token => !currentHoldings.find(h => h.symbol === token.symbol));

  return { tokensToSell, tokensToBuy };
}

async function initializeWallet() {
  Coinbase.configure({
    apiKeyName: process.env.CDP_API_KEY_NAME!,
    privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
  });

  const walletData = JSON.parse(fs.readFileSync(WALLET_DATA_FILE, 'utf8'));
  const wallet = await Wallet.import({
    walletId: walletData.walletId,
    seed: walletData.seed,
    networkId: walletData.networkId || 'base-sepolia'
  });

  return wallet;
}

async function executeTokenSells(wallet: Wallet, tokensToSell: TokenData[], totalAllocation: number) {
  // Guard against undefined or empty tokensToSell array
  if (!tokensToSell || tokensToSell.length === 0) {
    console.log('No tokens to sell during rebalance');
    return [];
  }

  const perTokenAllocation = totalAllocation / tokensToSell.length;

  const results = [];
  for (const token of tokensToSell) {
    try {
      console.log(`Selling ${token.symbol} for USDC`);
      const trade = await wallet.createTrade({
        amount: perTokenAllocation,
        fromAssetId: token.symbol,
        toAssetId: Coinbase.assets.Usdc,
        gasless: true
      });
      await trade.wait();
      results.push({ token, status: 'SUCCESS' });
    } catch (error) {
      console.error(`Failed to sell ${token.symbol}:`, error);
      results.push({ token, status: 'FAILED', error });
    }
  }
  return results;
}

async function executeTokenBuys(wallet: Wallet, tokensToBuy: TokenData[], totalAllocation: number) {
  const perTokenAllocation = totalAllocation / tokensToBuy.length;

  for (const token of tokensToBuy) {
    try {
      console.log(`Rebalance buy: ${perTokenAllocation} USDC -> ${token.symbol}`);
      const trade = await wallet.createTrade({
        amount: perTokenAllocation,
        fromAssetId: Coinbase.assets.Usdc,
        toAssetId: token.symbol,
        gasless: true
      });
      await trade.wait();
    } catch (error) {
      console.error(`Failed to buy ${token.symbol}:`, error);
    }
  }
}
