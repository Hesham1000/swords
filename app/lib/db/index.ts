import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// The provisioned database requires TLS but uses a self-signed certificate.
// Strip sslmode from the URL (postgres.js parses it as full verification) and
// pass a permissive ssl option instead, with a fast connect timeout so a
// transient network blip fails fast instead of hanging the pool.
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");

const client = postgres(url.toString(), {
  max: 10,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 8,
});

export const db = drizzle(client, { schema });
export { schema };
