import { SecretVaultWrapper } from 'nillion-sv-wrappers';
import { Strategy } from '../strategies/types';
import { nillionConfig } from '../config/nillion';
import { v4 as uuidv4 } from 'uuid';

// Define types for our stored data
interface WalletData {
  walletId: string;
  seed: string;
  networkId: string;
}

interface StrategyData {
  id: string;
  data: Strategy;
  timestamp: number;
}

// Simplified Nillion service just for wallet data
export class NillionService {
  private static instance: NillionService;
  private vault: SecretVaultWrapper;
  private initialized: boolean = false;
  private readonly WALLET_UUID = '123e4567-e89b-12d3-a456-426614174000';
  private readonly WALLET_FILE = 'wallet_data.txt.backup';

  private constructor() {
    this.vault = new SecretVaultWrapper(
      nillionConfig.nodes,
      nillionConfig.orgCredentials,
      process.env.NILLION_SCHEMA_ID!
    );
  }

  static getInstance(): NillionService {
    if (!NillionService.instance) {
      NillionService.instance = new NillionService();
    }
    return NillionService.instance;
  }

  async init() {
    if (!this.initialized) {
      await this.vault.init();
      this.initialized = true;
    }
  }

  async getWalletData(): Promise<WalletData | null> {
    try {
      await this.init();
      console.log('🔍 Attempting to read wallet data from Nillion...');

      const result = await this.vault.readFromNodes({ _id: this.WALLET_UUID });
      console.log('📥 Raw Nillion response:', JSON.stringify(result, null, 2));

      if (!result?.length) {
        console.log('❌ No wallet data found in Nillion');
        return null;
      }

      const walletData = {
        walletId: result[0].walletId,
        seed: result[0].seed,
        networkId: result[0].networkId
      };

      return walletData;
    } catch (error) {
      console.error('🚨 Error retrieving wallet data:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  async storeWalletData(walletData: WalletData): Promise<void> {
    try {
      await this.init();
      console.log('📝 Attempting to store wallet data...');

      const record = [{
        _id: this.WALLET_UUID,
        walletId: { $allot: String(walletData.walletId) },
        seed: { $allot: String(walletData.seed) },
        networkId: { $allot: String(walletData.networkId) }
      }];

      console.log('📦 Data structure being stored:', {
        _id: record[0]._id,
        hasWalletId: !!record[0].walletId,
        hasNetworkId: !!record[0].networkId
      });

      await this.vault.writeToNodes(record);
      console.log('✅ Wallet data successfully stored in Nillion');
    } catch (error) {
      console.error('🚨 Failed to store wallet data:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}
