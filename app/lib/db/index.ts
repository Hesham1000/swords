import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { db: ReturnType<typeof drizzle> };

if (!globalForDb.db) {
  const rawUrl = process.env.DATABASE_URL!;
  const url = new URL(rawUrl);
  url.searchParams.delete("sslmode");

  const client = postgres(url.toString(), {
    ssl: "require",
    max: 10,
    connect_timeout: 8,
  });

  globalForDb.db = drizzle(client, { schema });
}

export const db = globalForDb.db;

export {
  users,
  products,
  invoices,
  wallet,
  walletTransactions,
  shipments,
  inventoryLogs,
  blacklistTokens,
} from "./schema";
