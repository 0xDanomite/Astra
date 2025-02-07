import { Strategy, TokenData } from './types';
import { coingeckoService } from '../services/coingecko';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import * as fs from 'fs';

const WALLET_DATA_FILE = "wallet_data.txt";

// Initial setup - only buys
async function initialSetup(strategy: Strategy) {
  const allTokens = await coingeckoService.getTopTokensByCategory(
    strategy.parameters.category || 'base-meme-coins',
    100
  );

  // For testnet, use test tokens that we know exist
  const testTokens = [
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      platforms: { 'base-sepolia': '0x4200000000000000000000000000000000000006' }
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      platforms: { 'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e' }
    }
  ].slice(0, strategy.parameters.tokenCount);

  console.log('Using testnet tokens:', testTokens);

  const perTokenAllocation = strategy.parameters.totalAllocation / strategy.parameters.tokenCount;

  return { topTokens: testTokens, perTokenAllocation };
}

// Rebalance - includes sells if needed
async function rebalance(strategy: Strategy, currentHoldings: TokenData[]) {
  const allTokens = await coingeckoService.getTopTokensByCategory(
    strategy.parameters.category || 'base-meme-coins',
    100
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
    // Initialize CDP wallet and configuration
    const wallet = await initializeWallet();

    // Determine if this is initial setup or rebalance
    const isInitialSetup = strategy.currentHoldings.length === 0;

    if (isInitialSetup) {
      // Get top tokens for the category based on market cap
      const topTokens = await coingeckoService.getTopTokensByCategory(
        strategy.parameters.category!,
        strategy.parameters.tokenCount
      );

      const perTokenAllocation = strategy.parameters.totalAllocation / strategy.parameters.tokenCount;

      // Execute initial buys
      const trades = await Promise.all(topTokens.map(async (token) => {
        try {
          console.log(`Initial allocation: ${perTokenAllocation} USDC -> ${token.symbol}`);
          const trade = await wallet.createTrade({
            amount: perTokenAllocation,
            fromAssetId: Coinbase.assets.Usdc,
            toAssetId: token.symbol,
            gasless: true
          });
          await trade.wait();
          return { token, status: 'SUCCESS' };
        } catch (error) {
          console.error(`Trade failed for ${token.symbol}:`, error);
          return { token, status: 'FAILED', error };
        }
      }));

      strategy.currentHoldings = trades
        .filter(t => t.status === 'SUCCESS')
        .map(t => t.token);

    } else {
      // Get current top tokens for rebalancing
      const topTokens = await coingeckoService.getTopTokensByCategory(
        strategy.parameters.category!,
        strategy.parameters.tokenCount
      );

      // Calculate rebalancing needs
      const { tokensToSell, tokensToBuy } = calculateRebalancingNeeds(
        strategy.currentHoldings,
        topTokens,
        strategy.parameters.tokenCount
      );

      // Execute sells first
      await executeTokenSells(wallet, tokensToSell, strategy.parameters.totalAllocation);

      // Then execute buys
      await executeTokenBuys(wallet, tokensToBuy, strategy.parameters.totalAllocation);

      // Update holdings
      strategy.currentHoldings = topTokens;
    }

    strategy.lastRebalance = new Date();
    return {
      success: true,
      holdings: strategy.currentHoldings,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Strategy execution error:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
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
  const perTokenAllocation = totalAllocation / tokensToSell.length;

  for (const token of tokensToSell) {
    try {
      console.log(`Rebalance sell: ${token.symbol} -> USDC`);
      const trade = await wallet.createTrade({
        amount: perTokenAllocation,
        fromAssetId: token.symbol,
        toAssetId: Coinbase.assets.Usdc,
        gasless: true
      });
      await trade.wait();
    } catch (error) {
      console.error(`Failed to sell ${token.symbol}:`, error);
    }
  }
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
