import { Pool, QueryResult } from "pg";

declare global {
  var _pgPool: Pool | null;
}

/**
 * Creates the PostgreSQL connection pool.
 *
 * SSL handling (critical): the provisioned DATABASE_URL ends in
 * ?sslmode=no-verify / ?sslmode=require against a host with a self-signed
 * certificate. `pg` parses sslmode=require/prefer/verify-ca as FULL
 * certificate verification and fails with "self-signed certificate in
 * certificate chain" regardless of any ssl object passed alongside. The
 * verified fix is to strip the sslmode param from the URL and pass
 * ssl: { rejectUnauthorized: false } as a separate option.
 */
function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("Please define the DATABASE_URL environment variable");
  }

  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete("sslmode");

  return new Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
    // pg.Pool's default connectionTimeoutMillis is 0 (no timeout) — a stuck
    // handshake would hang forever and queue every other query behind it.
    connectionTimeoutMillis: 8000,
    max: 10,
    idleTimeoutMillis: 10000,
  });
}

/** Returns the cached pg Pool (created lazily on first use). */
export function getPool(): Pool {
  if (!global._pgPool) {
    global._pgPool = createPool();
  }
  return global._pgPool;
}

/**
 * Runs a parameterized query against the pool.
 * Always use $1/$2... placeholders — never interpolate user input.
 */
export async function query<T extends import("pg").QueryResultRow = any>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params as any[]);
}

/** Validates a PostgreSQL uuid string (replaces ObjectId.isValid checks). */
export function isUuid(value: string | undefined | null): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
