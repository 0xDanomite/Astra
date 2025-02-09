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

  async getTopTokensByCategory(category: string, limit: number): Promise<TokenData[]> {
    const baseTokens = await this.fetchBaseTokens(category, limit);

    // Fetch detailed data for each token
    const detailedTokens = await Promise.all(
      baseTokens.map(async (token) => {
        try {
          const details = await this.fetchTokenDetails(token?.id || '');
          return {
            ...token,
            market_cap: details.market_data?.market_cap?.usd,
            total_volume: details.market_data?.total_volume?.usd,
            address: details.platforms?.base // Make sure we get the Base address
          };
        } catch (error) {
          console.error(`Failed to fetch details for ${token.symbol}:`, error);
          return token;
        }
      })
    );

    console.log('Detailed token data:', detailedTokens.map(t => ({
      symbol: t.symbol,
      market_cap: t.market_cap,
      volume: t.total_volume,
      address: t.address
    })));

    return detailedTokens;
  }

  private async fetchBaseTokens(category: string, limit: number): Promise<TokenData[]> {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=${category}&per_page=${limit}`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-cg-demo-api-key': process.env.COINGECKO_API_KEY as string
      }
    });
    const data = await response.json();
    return data;
  }

  private async fetchTokenDetails(coinId: string): Promise<any> {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-cg-demo-api-key': process.env.COINGECKO_API_KEY as string
      }
    });
    return response.json();
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

  async getTokenPrices(symbols: string[]): Promise<Record<string, number>> {
    const symbolsLower = symbols.map(s => s.toLowerCase());
    const url = `${this.baseUrl}/simple/price?ids=${symbolsLower.join(',')}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'x-cg-demo-api-key': this.apiKey
      }
    });

    const data = await response.json();
    return Object.entries(data).reduce((acc, [id, prices]: [string, any]) => {
      acc[id] = prices.usd;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Export singleton instance
export const coingeckoService = new CoinGeckoService(process.env.COINGECKO_API_KEY || '');
