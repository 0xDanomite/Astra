import { NextResponse } from 'next/server';
import { coingeckoService } from '@/lib/services/coingecko';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'meme';
  const limit = parseInt(searchParams.get('limit') || '3');

  try {
    console.log(`Fetching tokens for category: ${category}, limit: ${limit}`);
    const tokens = await coingeckoService.getTopTokensByCategory(category, limit);
    console.log('Found tokens:', tokens);

    return NextResponse.json({
      tokens,
      metadata: {
        category,
        limit,
        count: tokens.length
      }
    });
  } catch (error) {
    console.error('Token fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
