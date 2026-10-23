import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";
import * as schema from "./schema";

config();

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  ssl: connectionString.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

export const db = drizzle(client, { schema });
export { schema };
