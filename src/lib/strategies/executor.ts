import { Strategy } from './types';
import { getBaseUrl } from '@/lib/utils/urls';

export async function executeStrategy(strategy: Strategy) {
  try {
    console.log('Executing strategy:', {
      id: strategy.id,
      type: strategy.type,
      parameters: strategy.parameters
    });

    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/api/strategy/execute-trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Strategy execution failed:', error);
      throw new Error(error.details || 'Failed to execute strategy');
    }

    const result = await response.json();
    console.log('Strategy execution completed:', result);
    return result;
  } catch (error) {
    console.error('Strategy execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date()
    };
  }
}

