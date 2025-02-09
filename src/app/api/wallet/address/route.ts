import { NextResponse } from 'next/server';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { NillionService } from '@/lib/services/nillion';

export async function GET() {
  try {
    // Initialize CDP SDK
    Coinbase.configure({
      apiKeyName: process.env.CDP_API_KEY_NAME!,
      privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
    });

    const nillionService = NillionService.getInstance();
    const walletData = await nillionService.getWalletData();

    if (!walletData) {
      throw new Error('No wallet data found');
    }

    const wallet = await Wallet.import({
      walletId: walletData.walletId,
      seed: walletData.seed,
      networkId: walletData.networkId || 'base-sepolia'
    });

    const address = await wallet.getDefaultAddress();

    return NextResponse.json({
      address: address.toString(),
      network: walletData.networkId || 'base-sepolia'
    });
  } catch (error) {
    console.error('Error fetching wallet address:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet address' },
      { status: 500 }
    );
  }
}
