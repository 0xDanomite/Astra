import { NextResponse } from 'next/server';
import { initializeAgent } from '@/lib/agent/chatbot';

export async function GET() {
  try {
    const { agentkit } = await initializeAgent();

    const walletProvider: any = agentkit.actionProviders.find(
      provider => provider.constructor.name === 'WalletActionProvider'
    );

    if (!walletProvider) {
      throw new Error('Wallet provider not found');
    }

    // Get wallet address using the wallet property
    const address = walletProvider.wallet.address;

    // Get ETH balance
    const ethBalance = await walletProvider.getBalance({ token: 'ETH' });

    // Get USDC balance
    const usdcBalance = await walletProvider.getBalance({ token: 'USDC' });

    return NextResponse.json({
      success: true,
      wallet: {
        address,
        balances: {
          ETH: ethBalance,
          USDC: usdcBalance
        },
        network: process.env.NETWORK_ID || 'base-sepolia'
      }
    });
  } catch (error) {
    console.error('Wallet status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get wallet status', details: error.message },
      { status: 500 }
    );
  }
}
