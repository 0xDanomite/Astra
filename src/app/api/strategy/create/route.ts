import { NextResponse } from 'next/server';
import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import { Strategy } from '@/lib/strategies/types';
import { StrategyScheduler } from '@/lib/strategies/scheduler';
import { executeStrategy } from '@/lib/strategies/executor';
import * as fs from 'fs';
import { initializeAgent } from '@/lib/agent/chatbot';

const WALLET_DATA_FILE = "wallet_data.txt";

export async function POST(request: Request) {
  try {
    const { parameters } = await request.json();
    const { agentkit } = await initializeAgent();

    // Initialize CDP SDK
    Coinbase.configure({
      apiKeyName: process.env.CDP_API_KEY_NAME!,
      privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
    });

    // Load existing wallet data
    let wallet;
    if (fs.existsSync(WALLET_DATA_FILE)) {
      const walletData = JSON.parse(fs.readFileSync(WALLET_DATA_FILE, 'utf8'));

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
      fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportData));
    }

    // Get wallet address
    const address = await wallet.getDefaultAddress();
    const addressString = address.model.address_id;

    const strategy: Strategy = {
      id: crypto.randomUUID(),
      name: parameters.name || 'Meme Token Strategy',
      type: parameters.type || 'MARKET_CAP',
      owner: {
        address: addressString,
        createdAt: new Date()
      },
      parameters: {
        category: parameters.category,
        rebalanceTime: parameters.rebalanceTime,
        tokenCount: parameters.tokenCount,
        totalAllocation: parameters.totalAllocation
      },
      agentWallet: {
        address: addressString,
        createdAt: new Date()
      },
      currentHoldings: [],
      lastRebalance: new Date()
    };

    // Execute strategy immediately for initial token purchase
    await executeStrategy(strategy, agentkit);

    // Then schedule future rebalances
    await StrategyScheduler.getInstance().scheduleStrategy(strategy);

    console.log('Created and scheduled strategy:', strategy);

    return NextResponse.json({
      success: true,
      strategy
    });
  } catch (error) {
    console.error('Strategy creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create strategy', details: error.message },
      { status: 500 }
    );
  }
}
