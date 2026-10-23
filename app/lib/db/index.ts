import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// The provisioned database requires TLS with a self-signed certificate.
// A connection string's own sslmode=require is parsed as full certificate
// verification by `postgres`, so strip it and pass the ssl option explicitly.
const connectionString = (process.env.DATABASE_URL || "").replace(
  /\?sslmode=[^&]*/,
  ""
);

const client = postgres(connectionString, {
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
});

export const db = drizzle(client, { schema });

export * from "./schema";
