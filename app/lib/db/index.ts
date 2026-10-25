import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Strip sslmode from the URL: the provisioned database uses a self-signed
// certificate, so sslmode parsing in the driver would fail cert verification.
// We instead pass an explicit ssl option that accepts the self-signed cert.
const url = new URL(process.env.DATABASE_URL!);
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
