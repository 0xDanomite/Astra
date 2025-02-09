import { createClient } from '@supabase/supabase-js';
import { Strategy } from '../strategies/types';
import { SupabaseClient } from '@supabase/supabase-js';

export class DatabaseService {
  private static instance: DatabaseService;
  private initialized: boolean = false;
  private supabase: SupabaseClient;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing. URL:', !!supabaseUrl, 'Key:', !!supabaseKey);
      throw new Error('Missing Supabase environment variables');
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('Supabase client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      throw error;
    }
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initializeTables() {
    if (this.initialized) return;

    try {
      // Test connection
      const { data, error } = await this.supabase
        .from('strategies')
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        // Table doesn't exist, create it
        const { error: createError } = await this.supabase.rpc('create_strategies_table');
        if (createError) throw createError;
      } else if (error) {
        throw error;
      }

      this.initialized = true;
      console.log('✅ Database connection established');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw new Error('Failed to initialize database. Check Supabase connection details.');
    }
  }

  async storeStrategy(strategy: Strategy): Promise<void> {
    const { error } = await this.supabase
      .from('strategies')
      .upsert({
        ...strategy,
        userId: strategy.userId
      });

    if (error) throw error;
  }

  async getStrategy(id: string): Promise<Strategy | null> {
    const { data, error } = await this.supabase
      .from('strategies')
      .select()
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getAllStrategies(): Promise<Strategy[]> {
    const { data, error } = await this.supabase
      .from('strategies')
      .select()
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async deleteStrategy(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('strategies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getActiveStrategies(userId: string): Promise<Strategy[]> {
    const { data, error } = await this.supabase
      .from('strategies')
      .select('*')
      .eq('status', 'ACTIVE')
      .eq('userId', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Strategy[];
  }

  async testConnection() {
    try {
      // Test authentication
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      if (authError) throw authError;

      // Test table access
      const { data, error: dbError } = await this.supabase
        .from('strategies')
        .select('id')
        .limit(1);

      if (dbError) throw dbError;

      console.log('✅ Database authentication successful', {
        user: user?.id,
        role: user?.role
      });

      return true;
    } catch (error) {
      console.error('Database authentication failed:', error);
      return false;
    }
  }

  async testRead() {
    const { data, error } = await this.supabase
      .from('strategies')
      .select('*');

    if (error) {
      console.error('Database read test failed:', error);
      return false;
    }

    console.log('✅ Database read test successful:', {
      count: data?.length || 0,
      data
    });
    return true;
  }

  async updateStrategyStatus(strategyId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    const { error } = await this.supabase
      .from('strategies')
      .update({
        status,
        last_updated: new Date().toISOString()
      })
      .eq('id', strategyId);

    if (error) throw error;
  }

  async removeStrategy(strategyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('strategies')
      .delete()
      .eq('id', strategyId);

    if (error) throw error;
  }
}
