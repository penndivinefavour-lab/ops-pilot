// Minimal fake Supabase client for testing
// Mimics only the methods ops-pilot actually calls

export interface FakeRow {
  [key: string]: unknown;
  id: number;
}

export interface FakeTable {
  data: FakeRow[];
  nextId: number;
}

const tables: Record<string, FakeTable> = {};

function ensureTable(name: string): FakeTable {
  if (!tables[name]) {
    tables[name] = { data: [], nextId: 1 };
  }
  return tables[name];
}

function resetTables() {
  Object.keys(tables).forEach((k) => {
    tables[k] = { data: [], nextId: 1 };
  });
}

export function getFakeDb() {
  function select<T extends FakeRow>(table: string, _columns?: string, _options?: Record<string, unknown>): Promise<T[]> {
    const tbl = ensureTable(table);
    return Promise.resolve(tbl.data as T[]);
  }

  function selectOne<T extends FakeRow>(table: string, _columns?: string, _filters?: Record<string, unknown>): Promise<T | null> {
    const tbl = ensureTable(table);
    if (_filters && _filters.id) {
      const found = tbl.data.find((r) => r.id === _filters.id);
      return Promise.resolve(found as T ?? null);
    }
    return Promise.resolve(null);
  }

  function insert<T extends FakeRow>(table: string, data: Record<string, unknown>, _options?: { returning?: string[] }): Promise<T> {
    const tbl = ensureTable(table);
    const id = (data.id as number) ?? tbl.nextId++;
    const row: FakeRow = { id, ...data };
    tbl.data.push(row);
    return Promise.resolve(row as T);
  }

  function updateOne<T extends FakeRow>(table: string, data: Record<string, unknown>, _filters: Record<string, unknown>): Promise<T | null> {
    const tbl = ensureTable(table);
    if (_filters.id) {
      const idx = tbl.data.findIndex((r) => r.id === _filters.id);
      if (idx === -1) return Promise.resolve(null);
      const updated = { ...tbl.data[idx], ...data };
      tbl.data[idx] = updated;
      return Promise.resolve(updated as T);
    }
    return Promise.resolve(null);
  }

  function upsertOne<T extends FakeRow>(table: string, data: Record<string, unknown>, _onConflict: string, _options?: { returning?: string[] }): Promise<T> {
    const tbl = ensureTable(table);
    // For test purposes, treat upsert as insert (real onConflict handled by DB)
    const id = (data.id as number) ?? tbl.nextId++;
    const row: FakeRow = { id, ...data };
    tbl.data.push(row);
    return Promise.resolve(row as T);
  }

  function deleteAll(table: string): Promise<void> {
    ensureTable(table);
    return Promise.resolve();
  }

  return {
    select,
    selectOne,
    insert,
    updateOne,
    upsertOne,
    delete: (table: string) => deleteAll(table),
  };
}

export { resetTables, tables };
