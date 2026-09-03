/**
 * Preloaded by `bun test` (see bunfig.toml).
 *
 * `@repo/db` and `lib/env.ts` both read the environment once at import time, so
 * the test configuration has to be in place before any test file is evaluated.
 * Bun also auto-loads `apps/api/.env`, which points at the development
 * database; this file deliberately overwrites those values.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. API integration tests need an isolated " +
      "PostgreSQL database whose name ends with `_test`, for example:\n" +
      "  createdb sketchforge_test\n" +
      "  DATABASE_URL=postgres://<user>@127.0.0.1:5432/sketchforge_test bun run db:migrate  # from packages/db\n" +
      "  TEST_DATABASE_URL=postgres://<user>@127.0.0.1:5432/sketchforge_test bun run test:integration",
  );
}

// Guard rail: these tests delete rows, so refuse anything that is not
// explicitly named as a test database. The name is safe to print; the URL is not.
const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");

if (!databaseName.endsWith("_test")) {
  throw new Error(
    `Refusing to run integration tests against database "${databaseName}": ` +
      "the database name must end with `_test`.",
  );
}

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
// Fixed, non-production values so tests never depend on developer secrets.
process.env.JWT_SECRET = "integration-test-jwt-secret-0123456789abcdef";
delete process.env.JWT_SECRET_PREVIOUS;
process.env.PUBLIC_ORIGIN = "http://localhost:3000";
process.env.API_PUBLIC_URL = "http://localhost:4001";
process.env.TRUST_PROXY = "0";
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
