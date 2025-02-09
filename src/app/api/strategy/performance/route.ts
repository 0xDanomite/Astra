import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database';

export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const strategies = await db.getAllStrategies();

    // Calculate total PNL across all strategies
    const totalValue = strategies.reduce((sum, strategy) => {
      return sum + (strategy.parameters.totalAllocation || 0);
    }, 0);

    // For now, return placeholder data
    // TODO: Implement real PNL calculation
    return NextResponse.json({
      totalValue,
      pnl: 0, // Placeholder
      pnlPercentage: 0, // Placeholder
      systemUptime: 100,
      successRate: 100,
      lastUpdate: new Date()
    });
  } catch (error) {
    console.error('Error fetching performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}
