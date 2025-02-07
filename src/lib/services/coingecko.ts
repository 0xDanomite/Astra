import { TokenData } from '../strategies/types';

interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  platforms: {
    [key: string]: string;  // platform -> contract address
  };
  market_cap: number;
  market_cap_rank: number;
  category: string;
}

export class CoinGeckoService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private apiKey: string;
  private cache: Map<string, { data: TokenData[], timestamp: number }> = new Map();
  private CACHE_DURATION = 15 * 60 * 1000; // Increase to 15 minutes
  private requestQueue: Promise<any>[] = [];
  private MAX_CONCURRENT_REQUESTS = 1;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTopTokensByCategory(category: string, count: number): Promise<TokenData[]> {
    const cacheKey = `${category}-${count}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    // Queue management for rate limiting
    while (this.requestQueue.length >= this.MAX_CONCURRENT_REQUESTS) {
      await this.requestQueue[0];
      this.requestQueue.shift();
    }

    const request = this.fetchFromCoingecko(category, count);
    this.requestQueue.push(request);
    const tokens = await request;

    this.cache.set(cacheKey, {
      data: tokens,
      timestamp: Date.now()
    });

    return tokens;
  }

  private async fetchFromCoingecko(category: string, count: number): Promise<TokenData[]> {
    try {
      // Get coins by category directly
      const response = await fetch(
        `${this.baseUrl}/coins/markets?vs_currency=usd&category=${category}&order=market_cap_desc&per_page=100&sparkline=false&x_cg_demo_api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const coins = await response.json();
      console.log(`Found ${coins.length} coins for category ${category}`); // Debug log

      // Get detailed info for each coin to check Base availability
      const detailedCoins = await Promise.all(
        coins.map(async (coin: any) => {
          try {
            const detailResponse = await fetch(
              `${this.baseUrl}/coins/${coin.id}?x_cg_demo_api_key=${this.apiKey}&localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
            );
            if (!detailResponse.ok) return null;
            const detail = await detailResponse.json();

            // Debug log for platforms
            console.log(`Coin ${coin.id} platforms:`, detail.platforms);

            return {
              symbol: coin.symbol,
              name: coin.name,
              marketCap: coin.market_cap,
              platforms: detail.platforms
            };
          } catch (error) {
            console.error(`Error fetching details for ${coin.id}:`, error);
            return null;
          }
        })
      );

      // Filter for Base availability and map to required format
      const baseTokens = detailedCoins
        .filter(coin => coin && coin.platforms && coin.platforms['base'])
        .slice(0, count)
        .map(coin => ({
          symbol: coin.symbol.toUpperCase(),
          address: coin.platforms['base'],
          marketCap: coin.marketCap,
          category: category
        }));

      console.log(`Found ${baseTokens.length} tokens on Base`); // Debug log
      return baseTokens;

    } catch (error) {
      console.error('Failed to fetch from CoinGecko:', error);
      throw error;
    }
  }

  // Get available categories
  async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/coins/categories?x_cg_demo_api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.statusText}`);
      }

      const categories = await response.json();
      return categories.map((cat: { name: string }) => cat.name.toLowerCase());
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const coingeckoService = new CoinGeckoService(process.env.COINGECKO_API_KEY || '');
