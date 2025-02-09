import { NextResponse } from 'next/server';
import { NillionService } from '@/lib/services/nillion';

export async function POST(request: Request) {
  try {
    const { userId, walletId, seed, networkId = 'base-sepolia' } = await request.json();

    if (!userId || !walletId || !seed) {
      return NextResponse.json({
        error: 'Missing required fields. Need userId, walletId, and seed.'
      }, { status: 400 });
    }

    const nillionService = NillionService.getInstance();
    await nillionService.init(); // Ensure Nillion is initialized

    await nillionService.storeWalletData({
      userId,
      walletId,
      seed,
      networkId,
    });

    // Verify the update by reading back the data
    const updatedData = await nillionService.getWalletData(userId);

    return NextResponse.json({
      success: true,
      message: 'Wallet data updated successfully',
      data: {
        userId,
        walletId: updatedData.walletId,
        networkId: updatedData.networkId,
        // Don't return the seed in the response for security
      }
    });

  } catch (error) {
    console.error('Failed to update wallet data:', error);
    return NextResponse.json({
      error: 'Failed to update wallet data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
