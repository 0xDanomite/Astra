import { NextResponse } from 'next/server';
import { coingeckoService } from '@/lib/services/coingecko';

export async function GET() {
  try {
    const categories = await coingeckoService.getCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
