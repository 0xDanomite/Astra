import { NillionService } from './nillion';
import { DatabaseService } from './database';

let initialized = false;

export async function initializeServices(userId: string) {
  if (initialized) return;

  try {
    const response = await fetch('/api/services/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      throw new Error('Failed to initialize services');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error);
    }

    console.log(result.message);

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
      const walletData = await nillionService.getWalletData(userId);
    } catch (error) {
      console.error('Nillion initialization failed:', error);
      // Continue initialization - Nillion errors shouldn't stop the app
    }

    initialized = true;
    console.log('✅ All services initialized');
  } catch (error) {
    console.error('Service initialization failed:', error);
    // Don't throw - let the app continue with degraded functionality
  }
}
