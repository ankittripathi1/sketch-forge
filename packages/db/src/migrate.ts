import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

export function resolveMigrationsFolder(): string {
  if (process.env.MIGRATIONS_FOLDER) {
    return process.env.MIGRATIONS_FOLDER;
  }

  return path.resolve(fileURLToPath(new URL("../drizzle", import.meta.url)));
}

export async function applyMigrations(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, prepare: false });
  const db = drizzle(client);

  try {
    await migrate(db, { migrationsFolder: resolveMigrationsFolder() });
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  await applyMigrations(databaseUrl);
}
