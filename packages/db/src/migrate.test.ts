/**
 * Migration tests against an isolated PostgreSQL database named `*_test`.
 *
 * These run the Drizzle SQL chain, not `drizzle-kit push`. They drop the
 * public schema, so they must never point at a development or production URL.
 */
import { afterAll, describe, expect, test } from "bun:test";
import postgres from "postgres";
import { applyMigrations } from "./migrate.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const canRun =
  Boolean(testDatabaseUrl) &&
  new URL(testDatabaseUrl!).pathname.replace(/^\//, "").endsWith("_test");

if (testDatabaseUrl && !canRun) {
  throw new Error(
    `Refusing to run migration tests against database ` +
      `"${new URL(testDatabaseUrl).pathname.replace(/^\//, "")}": ` +
      "the database name must end with `_test`.",
  );
}

const sql = canRun
  ? postgres(testDatabaseUrl!, { max: 1, prepare: false })
  : null;

afterAll(async () => {
  if (sql) {
    await sql.end();
  }
});

async function resetPublicSchema() {
  await sql!.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await sql!.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await sql!.unsafe("CREATE SCHEMA public");
  await sql!.unsafe("GRANT ALL ON SCHEMA public TO public");
}

async function tableColumns(table: string): Promise<string[]> {
  const rows = await sql!<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  return rows.map((row) => row.column_name);
}

async function indexNames(): Promise<string[]> {
  const rows = await sql!<{ indexname: string }[]>`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY indexname
  `;
  return rows.map((row) => row.indexname);
}

async function foreignKeys(): Promise<string[]> {
  const rows = await sql!<{ constraint_name: string }[]>`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
    ORDER BY constraint_name
  `;
  return rows.map((row) => row.constraint_name);
}

describe.skipIf(!canRun)("baseline migration", () => {
  test("empty database migrates to the current schema", async () => {
    await resetPublicSchema();
    await applyMigrations(testDatabaseUrl!);

    const tables = await sql!<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    expect(tables.map((row) => row.table_name)).toEqual([
      "canvases",
      "folders",
      "magic_link_tokens",
      "oauth_accounts",
      "pages",
      "refresh_tokens",
      "review_logs",
      "users",
    ]);

    expect(await tableColumns("pages")).toEqual([
      "id",
      "user_id",
      "folder_id",
      "title",
      "note",
      "view_mode",
      "elements",
      "thumbnail",
      "thumbnail_light",
      "thumbnail_dark",
      "status",
      "page_order",
      "tags",
      "searchable_text",
      "last_reviewed_at",
      "next_review_at",
      "ease_factor",
      "interval",
      "review_count",
      "createdAt",
      "updatedAt",
    ]);

    const indexes = await indexNames();
    expect(indexes).toContain("oauth_accounts_provider_account_idx");
    expect(indexes).toContain("folders_user_parent_idx");
    expect(indexes).toContain("pages_user_folder_idx");
    expect(indexes).toContain("pages_user_next_review_idx");
    expect(indexes).toContain("pages_user_status_idx");
    expect(indexes).toContain("pages_search_idx");
    expect(indexes).toContain("review_logs_user_id_idx");
    expect(indexes).toContain("review_logs_created_at_idx");
    expect(indexes).toContain("users_email_unique");

    const keys = await foreignKeys();
    expect(keys).toContain("pages_user_id_users_id_fk");
    expect(keys).toContain("pages_folder_id_folders_id_fk");
    expect(keys).toContain("folders_parent_id_folders_id_fk");
    expect(keys).toContain("oauth_accounts_user_id_users_id_fk");

    const enums = await sql!<{ enumlabel: string }[]>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'page_status'
      ORDER BY e.enumsortorder
    `;
    expect(enums.map((row) => row.enumlabel)).toEqual([
      "new",
      "learning",
      "mastered",
    ]);
  });

  test("migrate is recorded once and is a no-op the second time", async () => {
    await resetPublicSchema();
    await applyMigrations(testDatabaseUrl!);
    await applyMigrations(testDatabaseUrl!);

    const rows = await sql!<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM drizzle.__drizzle_migrations
    `;
    expect(rows[0]?.count).toBe("1");
  });

  test("a production-shaped fixture survives a second migrate", async () => {
    await resetPublicSchema();
    await applyMigrations(testDatabaseUrl!);

    const [user] = await sql!<{ id: string }[]>`
      INSERT INTO users (email, name)
      VALUES ('owner@fixture.test', 'Owner')
      RETURNING id
    `;
    const userId = user!.id;

    await sql!`
      INSERT INTO oauth_accounts (user_id, provider, "providerAccountId")
      VALUES (${userId}, 'google', 'google-account-1')
    `;

    const [folder] = await sql!<{ id: string }[]>`
      INSERT INTO folders (user_id, name)
      VALUES (${userId}, 'Inbox')
      RETURNING id
    `;

    const [page] = await sql!<{ id: string }[]>`
      INSERT INTO pages (
        user_id, folder_id, title, note, view_mode, searchable_text,
        thumbnail_light, thumbnail_dark
      )
      VALUES (
        ${userId}, ${folder!.id}, 'Pinned', 'body', 'doc', 'Pinned body',
        'light', 'dark'
      )
      RETURNING id
    `;

    await sql!`
      INSERT INTO canvases (user_id, title)
      VALUES (${userId}, 'Scratch')
    `;
    await sql!`
      INSERT INTO review_logs (user_id, page_id, quality)
      VALUES (${userId}, ${page!.id}, 4)
    `;

    await applyMigrations(testDatabaseUrl!);

    const [roundTrip] = await sql!<{
      note: string;
      view_mode: string;
      thumbnail_light: string;
    }[]>`
      SELECT note, view_mode, thumbnail_light FROM pages WHERE id = ${page!.id}
    `;
    expect(roundTrip).toEqual({
      note: "body",
      view_mode: "doc",
      thumbnail_light: "light",
    });

    const [oauthCount] = await sql!<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM oauth_accounts
    `;
    expect(oauthCount?.count).toBe("1");
  });

  test("duplicate (provider, providerAccountId) is rejected", async () => {
    await resetPublicSchema();
    await applyMigrations(testDatabaseUrl!);

    const [user] = await sql!<{ id: string }[]>`
      INSERT INTO users (email) VALUES ('dup@fixture.test') RETURNING id
    `;

    await sql!`
      INSERT INTO oauth_accounts (user_id, provider, "providerAccountId")
      VALUES (${user!.id}, 'google', 'same-account')
    `;

    let failed = false;
    try {
      await sql!`
        INSERT INTO oauth_accounts (user_id, provider, "providerAccountId")
        VALUES (${user!.id}, 'google', 'same-account')
      `;
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });
});
