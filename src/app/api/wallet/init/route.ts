import { NextResponse } from 'next/server';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { NillionService } from '@/lib/services/nillion';
// import { writeFileSync } from 'node:fs';

export async function POST() {
  try {
    const nillionService = NillionService.getInstance();

    // Initialize CDP SDK server-side only
    Coinbase.configure({
      apiKeyName: process.env.CDP_API_KEY_NAME!,
      privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
    });

    const walletData = await nillionService.getWalletData();
    let wallet;

    if (walletData) {
      wallet = await Wallet.import({
        walletId: walletData.walletId,
        seed: walletData.seed,
        networkId: walletData.networkId || 'base-sepolia'
      });
    } else {
      wallet = await Wallet.create();
      const exportData = wallet.export();
      await nillionService.storeWalletData({
        walletId: exportData.walletId,
        seed: exportData.seed,
        networkId: exportData.networkId || 'base-sepolia',
      });

      // Backup to file system (server-side only)
      // writeFileSync("wallet_data.txt", JSON.stringify(exportData, null, 2));
    }

    return NextResponse.json({
      success: true,
      address: await wallet.getDefaultAddress()
    });
  } catch (error) {
    console.error('Wallet initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize wallet' },
      { status: 500 }
    );
  }
}
