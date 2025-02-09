import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database';
import { executeStrategy } from '@/lib/strategies/executor';
import { strategyEmitter } from '@/lib/events/strategyEmitter';

export const runtime = 'edge';
export const preferredRegion = 'iad1';

export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const strategies = await db.getAllStrategies();
    const now = new Date();

    console.log(`🔄 Checking ${strategies.length} strategies for rebalancing...`);

    for (const strategy of strategies) {
      try {
        const rebalanceTime = strategy.parameters.rebalanceTime;
        const lastRebalanceDate = strategy.last_updated || strategy.created_at
          ? new Date(strategy.last_updated || strategy.created_at || '')
          : new Date();
        const shouldRebalance = isRebalanceNeeded(lastRebalanceDate, rebalanceTime || '1day', now);

        if (shouldRebalance) {
          console.log(`⚖️ Rebalancing strategy ${strategy.id}`);
          const updatedStrategy = await executeStrategy(strategy);

          // Emit update event
          strategyEmitter.emit('strategyUpdate', {
            type: 'HOLDINGS_UPDATED',
            strategyId: strategy.id,
            holdings: updatedStrategy.holdings,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Failed to process strategy ${strategy.id}:`, error);
        // Continue with other strategies
      }
    }

    // Emit updates using the shared emitter
    strategyEmitter.emit('strategyUpdate', {
      type: 'REBALANCE',
      strategies: strategies.length
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${strategies.length} strategies`
    });
  } catch (error) {
    console.error('Rebalance cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process strategies' },
      { status: 500 }
    );
  }
}

function isRebalanceNeeded(
  lastRebalance: Date,
  rebalanceTime: string,
  now: Date
): boolean {
  const match = rebalanceTime.match(/(\d+)(min|hour|day|week|month)/);
  if (!match) return false;

  const [_, value, unit] = match;
  const interval = parseInt(value);
  const lastRebalanceTime = new Date(lastRebalance).getTime();
  const diffMinutes = (now.getTime() - lastRebalanceTime) / (60 * 1000);

  switch (unit) {
    case 'min':
      return diffMinutes >= interval;
    case 'hour':
      return diffMinutes >= interval * 60;
    case 'day':
      return diffMinutes >= interval * 60 * 24;
    case 'week':
      return diffMinutes >= interval * 60 * 24 * 7;
    case 'month':
      return diffMinutes >= interval * 60 * 24 * 30; // Approximate
    default:
      return false;
  }
}
