import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Strip sslmode from the URL and configure SSL explicitly: the provisioned
// database uses a self-signed certificate, so verification must be disabled.
const url = new URL(connectionString);
const sslmode = url.searchParams.get("sslmode");
url.searchParams.delete("sslmode");
const needsSsl = sslmode === "require" || sslmode === "prefer" || sslmode === "verify-ca" || sslmode === "verify-full";

const client = postgres(url.toString(), {
  prepare: false,
  connect_timeout: 8,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(client, { schema });
