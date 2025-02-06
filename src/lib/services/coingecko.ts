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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTopTokensByCategory(category: string, limit: number): Promise<TokenData[]> {
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
        .slice(0, limit)
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
