import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// The provisioned database requires TLS with a self-signed certificate.
// Strip sslmode from the URL and configure TLS trust explicitly, otherwise
// the postgres driver fails with "self-signed certificate in certificate chain".
const rawUrl = process.env.DATABASE_URL!;
const url = new URL(rawUrl);
url.searchParams.delete("sslmode");

const client = postgres(url.toString(), {
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000,
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
