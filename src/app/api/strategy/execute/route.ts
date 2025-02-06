import { NextResponse } from 'next/server';
import { initializeAgent } from '@/lib/agent/chatbot';
import { executeStrategy } from '@/lib/strategies/executor';

export async function POST(request: Request) {
  try {
    const { strategy } = await request.json();
    const { agentkit } = await initializeAgent();

    const result = await executeStrategy(strategy, agentkit);

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Strategy execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute strategy' },
      { status: 500 }
    );
  }
}
