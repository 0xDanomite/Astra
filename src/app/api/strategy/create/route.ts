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
    console.log('Starting strategy creation...');

    const { parameters } = await request.json();
    console.log('Received parameters:', parameters);

    const { agentkit } = await initializeAgent();
    console.log('Agent initialized');

    const nillionService = NillionService.getInstance();
    const db = DatabaseService.getInstance();
    console.log('Services initialized');

    // Initialize CDP SDK
    try {
      console.log('Configuring Coinbase CDP...');
      Coinbase.configure({
        apiKeyName: process.env.CDP_API_KEY_NAME!,
        privateKey: process.env.CDP_API_KEY_PRIVATE_KEY!.replace(/\\n/g, "\n")
      });
    } catch (error) {
      console.error('CDP Configuration failed:', error);
      throw new Error(`CDP Configuration failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Get wallet data from Nillion
    console.log('Fetching wallet data...');
    const walletData = await nillionService.getWalletData();
    let wallet;

    if (walletData) {
      try {
        console.log('Importing existing wallet...');
        wallet = await Wallet.import({
          walletId: walletData.walletId,
          seed: walletData.seed,
          networkId: walletData.networkId || 'base-sepolia'
        });
      } catch (error) {
        console.error('Wallet import failed:', error);
        throw new Error(`Wallet import failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      try {
        console.log('Creating new wallet...');
        wallet = await Wallet.create();
        const exportData = wallet.export();
        await nillionService.storeWalletData({
          walletId: exportData.walletId,
          seed: exportData.seed,
          networkId: exportData.networkId || 'base-sepolia',
        });
      } catch (error) {
        console.error('New wallet creation failed:', error);
        throw new Error(`New wallet creation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Get wallet address
    console.log('Getting wallet address...');
    let addressString;
    try {
      const address = await wallet.getDefaultAddress();
      addressString = address.model.address_id;
      console.log('Wallet address obtained:', addressString);
    } catch (error) {
      console.error('Failed to get wallet address:', error);
      throw new Error(`Failed to get wallet address: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Create and store strategy
    console.log('Creating strategy...');
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

    try {
      console.log('Storing strategy in database...');
      await db.storeStrategy(strategy);
    } catch (error) {
      console.error('Strategy storage failed:', error);
      throw new Error(`Strategy storage failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Schedule the strategy
    try {
      console.log('Scheduling strategy...');
      const scheduler = StrategyScheduler.getInstance();
      await scheduler.scheduleStrategy(strategy);
    } catch (error) {
      console.error('Strategy scheduling failed:', error);
      throw new Error(`Strategy scheduling failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('Strategy creation completed successfully');
    return NextResponse.json({
      success: true,
      strategy
    });

  } catch (error) {
    console.error('Strategy creation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to create strategy',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
