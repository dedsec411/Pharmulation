/**
 * An in-memory stand-in for the Supabase client, for tests only.
 *
 * Not a general PostgREST emulator - it covers exactly the query shapes the
 * warehouse uses and throws loudly on anything else, so a query this cannot
 * answer fails the test instead of quietly returning nothing. A fake that
 * silently returns an empty array for a filter it does not understand is worse
 * than no fake at all: every assertion still passes and none of them mean
 * anything.
 *
 * It is deliberately not imported by any application code.
 */

type Row = Record<string, any>;

/**
 * Which columns join to which table, for the nested selects the code uses.
 *
 * `wh_catalogue.drug_id -> drugs` renders as `drugs: { ... }` on the row;
 * `wh_orders <- wh_order_lines.order_id` renders as an array. Both are how
 * PostgREST embeds them, and the code reads them that way.
 */
const BELONGS_TO: Record<string, Record<string, { table: string; via: string }>> = {
  wh_catalogue: { drugs: { table: "drugs", via: "drug_id" } },
  wh_stock: { drugs: { table: "drugs", via: "drug_id" } },
  wh_cd_register: { drugs: { table: "drugs", via: "drug_id" } },
};

const HAS_MANY: Record<string, Record<string, { table: string; foreignKey: string }>> = {
  wh_orders: { wh_order_lines: { table: "wh_order_lines", foreignKey: "order_id" } },
};

/** Tables whose rows get an id when one is not supplied. */
let counter = 0;
function newId(table: string): string {
  counter += 1;
  return `${table}-${String(counter).padStart(4, "0")}`;
}

export type FakeDb = {
  from: (table: string) => any;
  /** Direct access, for arranging a scenario and asserting on the result. */
  rows: (table: string) => Row[];
  set: (table: string, rows: Row[]) => void;
  /** Every query run, so a test can prove a code path was taken. */
  log: string[];
};

export function createFakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  const tables = new Map<string, Row[]>();
  for (const [name, rows] of Object.entries(seed)) {
    tables.set(name, rows.map((r) => ({ ...r })));
  }
  const log: string[] = [];

  const rowsOf = (table: string): Row[] => {
    if (!tables.has(table)) tables.set(table, []);
    return tables.get(table)!;
  };

  function embed(table: string, row: Row, select: string): Row {
    if (!select.includes("(")) return { ...row };
    const out: Row = { ...row };
    for (const [key, rel] of Object.entries(BELONGS_TO[table] ?? {})) {
      if (!select.includes(`${key}(`)) continue;
      out[key] = rowsOf(rel.table).find((r) => r.id === row[rel.via]) ?? null;
    }
    for (const [key, rel] of Object.entries(HAS_MANY[table] ?? {})) {
      if (!select.includes(`${key}(`)) continue;
      out[key] = rowsOf(rel.table)
        .filter((r) => r[rel.foreignKey] === row.id)
        .map((r) => ({ ...r }));
    }
    return out;
  }

  function builder(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let select = "*";
    let mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
    let payload: Row[] = [];
    let conflictKeys: string[] = [];
    let orderBy: { column: string; ascending: boolean } | null = null;
    let limit: number | null = null;
    let single: "one" | "maybe" | null = null;

    function matching(): Row[] {
      return rowsOf(table).filter((row) => filters.every((f) => f(row)));
    }

    function run(): { data: any; error: any } {
      log.push(`${mode} ${table}`);

      if (mode === "insert" || mode === "upsert") {
        const written: Row[] = [];
        for (const incoming of payload) {
          if (mode === "upsert" && conflictKeys.length) {
            const existing = rowsOf(table).find((row) =>
              conflictKeys.every((key) => row[key] === incoming[key]));
            if (existing) {
              Object.assign(existing, incoming);
              written.push(existing);
              continue;
            }
          }
          const row = { id: incoming.id ?? newId(table), ...incoming };
          rowsOf(table).push(row);
          written.push(row);
        }
        const data = written.map((r) => embed(table, r, select));
        if (single) return { data: data[0] ?? null, error: null };
        return { data, error: null };
      }

      if (mode === "update") {
        const hit = matching();
        for (const row of hit) Object.assign(row, payload[0]);
        return { data: hit.map((r) => ({ ...r })), error: null };
      }

      if (mode === "delete") {
        const doomed = new Set(matching());
        tables.set(table, rowsOf(table).filter((row) => !doomed.has(row)));
        return { data: null, error: null };
      }

      let found = matching().map((row) => embed(table, row, select));
      if (orderBy) {
        const { column, ascending } = orderBy;
        found = [...found].sort((a, b) => {
          const left = a[column];
          const right = b[column];
          if (left === right) return 0;
          return (left > right ? 1 : -1) * (ascending ? 1 : -1);
        });
      }
      if (limit !== null) found = found.slice(0, limit);

      if (single === "one") {
        if (found.length !== 1) {
          return { data: null, error: { message: `expected exactly one ${table} row, got ${found.length}` } };
        }
        return { data: found[0], error: null };
      }
      if (single === "maybe") {
        if (found.length > 1) {
          return { data: null, error: { message: `maybeSingle matched ${found.length} ${table} rows` } };
        }
        return { data: found[0] ?? null, error: null };
      }
      return { data: found, error: null };
    }

    const api: any = {
      select(columns = "*") { select = columns; return api; },
      eq(column: string, value: any) { filters.push((row) => row[column] === value); return api; },
      neq(column: string, value: any) { filters.push((row) => row[column] !== value); return api; },
      gt(column: string, value: any) { filters.push((row) => Number(row[column]) > Number(value)); return api; },
      gte(column: string, value: any) { filters.push((row) => Number(row[column]) >= Number(value)); return api; },
      lt(column: string, value: any) { filters.push((row) => Number(row[column]) < Number(value)); return api; },
      in(column: string, values: any[]) { filters.push((row) => values.includes(row[column])); return api; },
      order(column: string, options?: { ascending?: boolean }) {
        orderBy = { column, ascending: options?.ascending !== false };
        return api;
      },
      limit(count: number) { limit = count; return api; },
      maybeSingle() { single = "maybe"; return api; },
      single() { single = "one"; return api; },
      insert(values: Row | Row[]) {
        mode = "insert";
        payload = Array.isArray(values) ? values.map((v) => ({ ...v })) : [{ ...values }];
        return api;
      },
      upsert(values: Row | Row[], options?: { onConflict?: string }) {
        mode = "upsert";
        payload = Array.isArray(values) ? values.map((v) => ({ ...v })) : [{ ...values }];
        conflictKeys = (options?.onConflict ?? "").split(",").map((k) => k.trim()).filter(Boolean);
        return api;
      },
      update(values: Row) { mode = "update"; payload = [{ ...values }]; return api; },
      delete() { mode = "delete"; return api; },
      then(resolve: (value: any) => any, reject?: (reason: any) => any) {
        try {
          return Promise.resolve(run()).then(resolve, reject);
        } catch (error) {
          return Promise.reject(error).then(resolve, reject);
        }
      },
    };
    return api;
  }

  return {
    from: builder,
    rows: (table: string) => rowsOf(table).map((r) => ({ ...r })),
    set: (table: string, rows: Row[]) => { tables.set(table, rows.map((r) => ({ ...r }))); },
    log,
  };
}
