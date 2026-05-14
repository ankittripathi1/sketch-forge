import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema.js";

export const db = drizzle(Bun.sql, { schema });

export * from "./schema.js";
