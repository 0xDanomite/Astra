import { Strategy, TokenData } from './types';
import { coingeckoService } from '../services/coingecko';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import * as fs from 'fs';

const WALLET_DATA_FILE = "wallet_data.txt";

// Initial setup - only buys
async function initialSetup(strategy: Strategy) {
  const testTokens = [
    {
      symbol: 'WETH',
      name: 'Wrapped Ether',
      platforms: { 'base-sepolia': '0x4200000000000000000000000000000000000006' }
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      platforms: { 'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7c' }
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

  // Filter and map Base tokens
  // const baseTokens = allTokens
  //   .filter(token => token.platforms && token.platforms.base)
  //   .map(token => ({
  //     symbol: token.symbol.toUpperCase(),
  //     name: token.name,
  //     platforms: token.platforms
  //   }))
  //   .slice(0, strategy.parameters.tokenCount);

  // if (baseTokens.length === 0) {
  //   throw new Error('No valid Base tokens found for rebalancing');
  // }

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

    // Determine if this is initial setup or rebalance
    const isInitialSetup = strategy.currentHoldings.length === 0;

    if (isInitialSetup) {
      const { topTokens, perTokenAllocation } = await initialSetup(strategy);

      // Execute initial buys
      for (const token of topTokens) {
        try {
          console.log(`Initial buy: ${perTokenAllocation} USDC -> ${token.symbol}`);
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
      strategy.currentHoldings = topTokens;
    } else {
      const { tokensToSell, tokensToBuy, perTokenAllocation } = await rebalance(strategy, strategy.currentHoldings);

      // Execute sells first
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

      // Then execute buys
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

      // Update holdings
      strategy.currentHoldings = [...strategy.currentHoldings.filter(h =>
        !tokensToSell.find(s => s.symbol === h.symbol)
      ), ...tokensToBuy];
    }

    strategy.lastRebalance = new Date();
    return { success: true, holdings: strategy.currentHoldings };
  } catch (error) {
    console.error('Strategy execution error:', error);
    throw error;
  }
}
