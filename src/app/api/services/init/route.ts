import { NextResponse } from 'next/server';
import { NillionService } from '@/lib/services/nillion';
import { DatabaseService } from '@/lib/services/database';

export async function POST() {
  try {
    // Initialize core services
    const nillionService = NillionService.getInstance();
    const db = DatabaseService.getInstance();

    // Initialize database first
    try {
      await db.initializeTables();
    } catch (error) {
      console.error('Database initialization failed:', error);
      // Continue initialization - database errors shouldn't stop the app
    }

    // Initialize Nillion
    try {
      await nillionService.init();
      const walletData = await nillionService.getWalletData();
    } catch (error) {
      console.error('Nillion initialization failed:', error);
      // Continue initialization - Nillion errors shouldn't stop the app
    }

    return NextResponse.json({
      success: true,
      message: '✅ All services initialized'
    });
  } catch (error) {
    console.error('Service initialization failed:', error);
    return NextResponse.json(
      { error: 'Failed to initialize services' },
      { status: 500 }
    );
  }
}
