import { Strategy } from './types';
import { getBaseUrl } from '@/lib/utils/urls';
import { headers } from 'next/headers';

export async function executeStrategy(strategy: Strategy) {
  try {
    console.log('Executing strategy:', {
      id: strategy.id,
      type: strategy.type,
      parameters: strategy.parameters
    });

    const baseUrl = getBaseUrl();

    // Get original request headers
    let requestHeaders = {};
    try {
      const headersList = await headers();
      requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': headersList.get('authorization') || '',
        'Cookie': headersList.get('cookie') || '',
      };
    } catch (error) {
      console.warn('Could not get original request headers:', error);
      requestHeaders = { 'Content-Type': 'application/json' };
    }

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

