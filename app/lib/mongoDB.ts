// app/lib/mongoDB.ts
// Migrated from Mongoose to PostgreSQL (pg).
// The old Mongoose collection accessors are gone; all data access now goes
// through the pg pool in ./db. This file re-exports the pool helpers so any
// remaining imports keep working.
export { query, getPool, isUuid } from "./db";
