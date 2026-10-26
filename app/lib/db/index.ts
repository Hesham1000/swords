import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  users,
  products,
  invoices,
  wallet,
  walletTransactions,
  shipments,
  blacklistTokens,
  inventoryLogs,
} from "./schema";

// Strip sslmode from the connection string: managed Postgres hosts use
// self-signed certificates, so sslmode=require/no-verify would be parsed as
// full certificate verification and fail. TLS is enabled explicitly instead.
const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");

const client = postgres(url.toString(), {
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(client);

export {
  users,
  products,
  invoices,
  wallet,
  walletTransactions,
  shipments,
  blacklistTokens,
  inventoryLogs,
};
