import { NextResponse } from 'next/server';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { Strategy } from '@/lib/strategies/types';
import { StrategyScheduler } from '@/lib/strategies/scheduler';
import { executeStrategy } from '@/lib/strategies/executor';
import { initializeAgent } from '@/lib/agent/chatbot';
import { NillionService } from '@/lib/services/nillion';
import { DatabaseService } from '@/lib/services/database';

export async function POST(request: Request) {
  try {
    const { parameters } = await request.json();
    const { agentkit } = await initializeAgent();
    const nillionService = NillionService.getInstance();
    const db = DatabaseService.getInstance();

    // Initialize CDP SDK
    Coinbase.configure({
      apiKeyName: process.env.CDP_API_KEY_NAME!,
      privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
    });

    // Get wallet data from Nillion
    const walletData = await nillionService.getWalletData();
    let wallet;

    if (walletData) {
      // Import wallet using the saved data
      wallet = await Wallet.import({
        walletId: walletData.walletId,
        seed: walletData.seed,
        networkId: walletData.networkId || 'base-sepolia'
      });
    } else {
      // Create new wallet if no data exists
      wallet = await Wallet.create();
      const exportData = wallet.export();
      await nillionService.storeWalletData({
        walletId: exportData.walletId,
        seed: exportData.seed,
        networkId: exportData.networkId || 'base-sepolia',
      });
    }

    // Get wallet address
    const address = await wallet.getDefaultAddress();
    const addressString = address.model.address_id;

    // Create and store strategy
    const strategy: Strategy = {
      id: `strategy-${Date.now()}`,
      type: parameters.type,
      status: 'ACTIVE',
      parameters: {
        ...parameters,
        walletAddress: addressString
      },
      current_holdings: []
    };

    // Store in Postgres
    await db.storeStrategy(strategy);

    // Initialize strategy execution
    const scheduler = StrategyScheduler.getInstance();
    await scheduler.scheduleStrategy(strategy);
    await executeStrategy(strategy);

    return NextResponse.json({ success: true, strategy });
  } catch (error) {
    console.error('Error creating strategy:', error);
    return NextResponse.json(
      { error: 'Failed to create strategy' },
      { status: 500 }
    );
  }
}
