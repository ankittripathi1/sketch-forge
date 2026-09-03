import { describe, expect, test } from "bun:test";
import { parseEnv } from "./env.js";

const valid = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://user@db:5432/app",
  JWT_SECRET: "a".repeat(20) + "b".repeat(20),
  PUBLIC_ORIGIN: "https://example.com",
  API_PUBLIC_URL: "https://example.com/api",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "SketchForge <login@example.com>",
} satisfies NodeJS.ProcessEnv;

function expectRejected(overrides: NodeJS.ProcessEnv, variable: string) {
  let message = "";
  try {
    parseEnv({ ...valid, ...overrides });
    throw new Error("expected parseEnv to throw");
  } catch (error) {
    message = (error as Error).message;
  }

  expect(message).toContain("Invalid environment configuration");
  expect(message).toContain(variable);
  return message;
}

describe("parseEnv", () => {
  test("accepts a complete production configuration", () => {
    const parsed = parseEnv(valid);

    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.PORT).toBe(4001);
    expect(parsed.TRUST_PROXY).toBe(false);
  });

  test("rejects a missing secret", () => {
    expectRejected({ JWT_SECRET: undefined }, "JWT_SECRET");
  });

  test("rejects a short secret", () => {
    expectRejected({ JWT_SECRET: "short-secret" }, "JWT_SECRET");
  });

  test("rejects a well-known placeholder secret", () => {
    expectRejected(
      { JWT_SECRET: "replace-with-a-long-random-secret" },
      "JWT_SECRET",
    );
  });

  test("rejects a secret that is one repeated character", () => {
    expectRejected({ JWT_SECRET: "x".repeat(48) }, "JWT_SECRET");
  });

  test("never echoes a rejected value", () => {
    const message = expectRejected(
      { JWT_SECRET: "hunter2-plaintext-do-not-log" },
      "JWT_SECRET",
    );

    expect(message).not.toContain("hunter2");
  });

  test("rejects a missing database url", () => {
    expectRejected({ DATABASE_URL: undefined }, "DATABASE_URL");
  });

  test("requires https in production", () => {
    expectRejected(
      {
        PUBLIC_ORIGIN: "http://example.com",
        API_PUBLIC_URL: "http://example.com/api",
      },
      "PUBLIC_ORIGIN",
    );
  });

  test("rejects an origin carrying a path or trailing slash", () => {
    expectRejected({ PUBLIC_ORIGIN: "https://example.com/" }, "PUBLIC_ORIGIN");
  });

  test("requires the api to share the public origin in production", () => {
    expectRejected(
      { API_PUBLIC_URL: "https://api.example.com" },
      "API_PUBLIC_URL",
    );
  });

  test("allows a separate api origin outside production", () => {
    const parsed = parseEnv({
      ...valid,
      NODE_ENV: "development",
      PUBLIC_ORIGIN: "http://localhost:3000",
      API_PUBLIC_URL: "http://localhost:4001",
    });

    expect(parsed.API_PUBLIC_URL).toBe("http://localhost:4001");
  });

  test("requires a mail sender in production", () => {
    expectRejected({ EMAIL_FROM: undefined }, "EMAIL_FROM");
    expectRejected({ RESEND_API_KEY: undefined }, "RESEND_API_KEY");
  });

  test("requires both google credentials or neither", () => {
    expectRejected({ GOOGLE_CLIENT_ID: "id-only" }, "GOOGLE_CLIENT_SECRET");
    expectRejected({ GOOGLE_CLIENT_SECRET: "secret-only" }, "GOOGLE_CLIENT_ID");

    const parsed = parseEnv({
      ...valid,
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
    });
    expect(parsed.GOOGLE_CLIENT_ID).toBe("id");
  });

  test("treats a blank value as unset", () => {
    // docker-compose writes "" for `${VAR:-}` when VAR is not set.
    const parsed = parseEnv({
      ...valid,
      JWT_SECRET_PREVIOUS: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "  ",
    });

    expect(parsed.JWT_SECRET_PREVIOUS).toBeUndefined();
    expect(parsed.GOOGLE_CLIENT_ID).toBeUndefined();
  });

  test("still rejects a blank required value", () => {
    expectRejected({ JWT_SECRET: "" }, "JWT_SECRET");
  });

  test("reports every problem at once", () => {
    const message = expectRejected(
      { JWT_SECRET: undefined, DATABASE_URL: undefined },
      "JWT_SECRET",
    );

    expect(message).toContain("DATABASE_URL");
  });
});
