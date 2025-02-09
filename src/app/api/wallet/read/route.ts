import { NextResponse } from 'next/server';
import { NillionService } from '@/lib/services/nillion';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const nillionService = NillionService.getInstance();
    await nillionService.init();

    const walletData = await nillionService.getWalletData(userId);

    if (!walletData) {
      return NextResponse.json({ error: 'No wallet data found for this user' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        walletId: walletData.walletId,
        seed: walletData.seed, // Be careful with exposing seed in production
        networkId: walletData.networkId
      }
    });

  } catch (error) {
    console.error('Failed to read wallet data:', error);
    return NextResponse.json({
      error: 'Failed to read wallet data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
