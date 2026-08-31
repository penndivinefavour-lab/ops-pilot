import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export function getAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

type DbRow = Record<string, unknown>;

class Database {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  async select<T extends DbRow>(table: string, _columnsOrOpts?: string | { limit?: number; offset?: number }, opts?: { limit?: number; offset?: number }): Promise<T[]> {
    // Handle both signatures: select(table), select(table, columns), select(table, opts), select(table, columns, opts)
    let limit = 500;
    let offset = 0;
    let columns = '*';
    
    if (typeof _columnsOrOpts === 'object' && _columnsOrOpts !== null) {
      // Called as select(table, opts)
      limit = _columnsOrOpts.limit ?? limit;
      offset = _columnsOrOpts.offset ?? offset;
    } else if (typeof _columnsOrOpts === 'string') {
      columns = _columnsOrOpts;
      if (opts) {
        limit = opts.limit ?? limit;
        offset = opts.offset ?? offset;
      }
    }
    if (opts) {
      limit = opts.limit ?? limit;
      offset = opts.offset ?? offset;
    }
    
    const result = await this.client.from(table).select(columns).range(offset, offset + limit - 1);
    if (result.error) throw result.error;
    return ((result.data ?? []) as unknown) as T[];
  }

  async selectOne<T extends DbRow>(table: string, _columns?: string, filters?: Record<string, unknown>): Promise<T | null> {
    let query = this.client.from(table).select('*');
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
    }
    const result = await query.single();
    if (result.error) {
      if (result.error.message?.includes('No rows')) return null;
      throw result.error;
    }
    return (result.data ?? null) as T;
  }

  async insert<T extends DbRow>(table: string, data: Record<string, unknown>): Promise<T> {
    const result = await this.client.from(table).insert(data);
    if (result.error) throw result.error;
    return (result.data?.[0] ?? data) as T;
  }

  async updateOne<T extends DbRow>(table: string, data: Record<string, unknown>, filters: Record<string, unknown>): Promise<T | null> {
    let query = this.client.from(table).update(data);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const result = await query.select();
    if (result.error) throw result.error;
    return (result.data?.[0] ?? null) as T | null;
  }

  async upsertOne<T extends DbRow>(table: string, data: Record<string, unknown>, onConflict: string): Promise<T> {
    const result = await this.client.from(table).upsert(data, { onConflict });
    if (result.error) throw result.error;
    return (result.data?.[0] ?? data) as T;
  }

  async count(table: string): Promise<number> {
    const result = await this.client.from(table).select('*', { count: 'exact', head: true });
    if (result.error) throw result.error;
    return (result.count ?? 0) as number;
  }
}

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (dbInstance) return dbInstance;
  dbInstance = new Database(getServiceRoleClient());
  return dbInstance;
}

export function resetDbCache(): void {
  dbInstance = null;
}
