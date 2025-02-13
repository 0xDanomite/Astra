import { Strategy } from './types';
import { getBaseUrl } from '@/lib/utils/urls';

export async function executeStrategy(strategy: Strategy, headers?: HeadersInit) {
  try {
    console.log('Executing strategy:', {
      id: strategy.id,
      type: strategy.type,
      parameters: strategy.parameters
    });

    const baseUrl = getBaseUrl();

    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const response = await fetch(`${baseUrl}/api/strategy/execute-trades`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({ strategy }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Execute trades failed:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      throw new Error(error.details || 'Failed to execute strategy');
    }

    const result = await response.json();
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

