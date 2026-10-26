import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const rawUrl = process.env.DATABASE_URL!;
const url = new URL(rawUrl);
url.searchParams.delete("sslmode");

const client = postgres(url.toString(), {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 8,
});

export const db = drizzle(client, { schema });

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
