import { neon } from "@neondatabase/serverless";

export function getNeonSql() {
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    return null;
  }

  return neon(connectionString);
}
