import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/services/database';

export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const strategies = await db.getAllStrategies();
    const currentStrategy = strategies[0]; // Get most recent

    if (!currentStrategy) {
      return NextResponse.json({ error: 'No active strategy found' }, { status: 404 });
    }

    return NextResponse.json(currentStrategy);
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategy data' },
      { status: 500 }
    );
  }
}
