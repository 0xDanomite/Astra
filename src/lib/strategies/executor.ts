import { Strategy, TokenData } from './types';
import { coingeckoService } from '../services/coingecko';
import { DatabaseService } from '../services/database';
import { StrategyScheduler } from './scheduler';
import { getBaseUrl } from '@/lib/utils/urls';

const WALLET_DATA_FILE = "wallet_data.txt";

type TokenSelectionStrategy = 'RANDOM' | 'MARKET_CAP' | 'VOLUME';

function selectTokens(tokens: TokenData[], count: number, strategy: TokenSelectionStrategy): TokenData[] {
  // Filter out tokens with missing required data first
  const validTokens = tokens.filter(token =>
    token.address &&
    (strategy !== 'MARKET_CAP' || token.market_cap !== undefined) &&
    (strategy !== 'VOLUME' || token.total_volume !== undefined)
  );

  console.log(`Processing ${validTokens.length} valid tokens for ${strategy} strategy`);

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
  const scheduler = StrategyScheduler.getInstance();
  const db = DatabaseService.getInstance();

  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/strategy/execute-trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy: {
          ...strategy,
          // Pass through the date strings
          created_at: strategy.created_at || new Date().toISOString(),
          last_updated: strategy.last_updated || new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to execute trades');
    }

    const result = await response.json();

    // Add safety check for holdings
    const holdings = result?.holdings || strategy.current_holdings || [];

    // Update strategy in database with ISO string dates
    await db.storeStrategy({
      ...strategy,
      current_holdings: holdings,
      last_updated: new Date().toISOString(),
      created_at: strategy.created_at || new Date().toISOString()
    });

    return {
      success: true,
      holdings,
      message: 'Strategy executed successfully'
    };
  } catch (error) {
    console.error('Strategy execution failed:', error);
    throw error;
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

// Helper function to convert USDC amounts properly
function formatUSDCAmount(amount: number): bigint {
  // Convert to smallest unit (6 decimals for USDC)
  return BigInt(Math.floor(amount * 1_000_000));
}

