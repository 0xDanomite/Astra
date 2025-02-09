import { NextResponse } from 'next/server';

// Only allow this endpoint in development
const isDevelopment = process.env.NODE_ENV === 'development';

export async function GET() {
  if (!isDevelopment) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    // Call the rebalance endpoint directly
    const response = await fetch('http://localhost:3000/api/cron/rebalance');
    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Triggered rebalance check',
      result
    });
  } catch (error) {
    console.error('Failed to trigger rebalance:', error);
    return NextResponse.json(
      { error: 'Failed to trigger rebalance' },
      { status: 500 }
    );
  }
}
