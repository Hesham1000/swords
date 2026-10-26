import { defineConfig } from "drizzle-kit";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode");

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: url.toString(),
    ssl: { rejectUnauthorized: false },
  },
});
