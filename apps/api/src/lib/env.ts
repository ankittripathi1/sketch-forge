import { z } from "zod";

/**
 * Runtime configuration for the API.
 *
 * Parsed once at import time so a misconfigured deployment fails at startup
 * rather than at the first request. Failure messages name the offending
 * variables and never include their values.
 */

const MIN_SECRET_LENGTH = 32;

// Values people reach for when a deployment "just needs something here".
const KNOWN_WEAK_SECRETS = new Set([
  "secret",
  "changeme",
  "change-me",
  "password",
  "jwt_secret",
  "jwtsecret",
  "supersecret",
  "your-secret-here",
  "replace-with-a-long-random-secret",
]);

const secret = z
  .string()
  .min(MIN_SECRET_LENGTH, `must be at least ${MIN_SECRET_LENGTH} characters`)
  .refine((value) => !KNOWN_WEAK_SECRETS.has(value.trim().toLowerCase()), {
    message: "is a well-known placeholder value",
  })
  .refine((value) => new Set(value).size > 1, {
    message: "must not be a single repeated character",
  });

/** A bare origin: scheme, host, optional port. No path, query, or trailing slash. */
const origin = z.string().refine(
  (value) => {
    try {
      return new URL(value).origin === value;
    } catch {
      return false;
    }
  },
  { message: "must be a bare origin such as https://example.com" },
);

/** An absolute URL with no trailing slash, query, or fragment. */
const baseUrl = z.string().refine(
  (value) => {
    try {
      const url = new URL(value);
      return (
        !value.endsWith("/") &&
        url.search === "" &&
        url.hash === "" &&
        !!url.protocol.startsWith("http")
      );
    } catch {
      return false;
    }
  },
  { message: "must be an absolute http(s) URL with no trailing slash" },
);

const booleanish = z
  .string()
  .transform((value) =>
    ["1", "true", "yes", "on"].includes(value.toLowerCase()),
  );

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(4001),
    DATABASE_URL: z.string().min(1),

    JWT_SECRET: secret,
    // Set during a secret rotation so sessions signed with the old secret keep
    // verifying until they expire. Remove it to revoke them immediately.
    JWT_SECRET_PREVIOUS: secret.optional(),

    // The public origin the browser loads the web app from. Used for redirects,
    // CORS, and the cross-origin check on state-changing requests.
    PUBLIC_ORIGIN: origin,

    // Public base URL of this API, as the browser reaches it. In production it
    // must sit under PUBLIC_ORIGIN (see the check below) so the session cookie
    // has a single host to belong to.
    API_PUBLIC_URL: baseUrl,

    // Set only when the API is reachable exclusively through the reverse proxy,
    // otherwise clients can spoof their own address via X-Forwarded-For.
    TRUST_PROXY: booleanish.default(false),

    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const require = (key: keyof typeof value, message: string) => {
      if (!value[key]) {
        ctx.addIssue({ code: "custom", path: [key], message });
      }
    };

    if (value.NODE_ENV === "production") {
      if (!value.PUBLIC_ORIGIN.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          path: ["PUBLIC_ORIGIN"],
          message: "must use https in production",
        });
      }

      // One public origin. A session cookie set by a different API hostname is
      // not visible to the web app, and no shared cookie domain is used.
      if (
        value.API_PUBLIC_URL !== value.PUBLIC_ORIGIN &&
        !value.API_PUBLIC_URL.startsWith(`${value.PUBLIC_ORIGIN}/`)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["API_PUBLIC_URL"],
          message: "must be served under PUBLIC_ORIGIN in production",
        });
      }

      require("RESEND_API_KEY", "is required in production");
      require("EMAIL_FROM", "is required in production");
    }

    const hasId = Boolean(value.GOOGLE_CLIENT_ID);
    const hasSecret = Boolean(value.GOOGLE_CLIENT_SECRET);
    if (hasId !== hasSecret) {
      ctx.addIssue({
        code: "custom",
        path: [hasId ? "GOOGLE_CLIENT_SECRET" : "GOOGLE_CLIENT_ID"],
        message: "is required when the other Google credential is set",
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates a set of environment variables.
 *
 * Exported separately from {@link env} so the failure behaviour can be tested
 * without mutating the running process.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  // Compose files and deployment platforms routinely inject "" for a variable
  // that was simply not set. Treat that as absent so defaults and `.optional()`
  // behave the way the operator expects.
  const present: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value.trim() !== "") {
      present[key] = value;
    }
  }

  const result = EnvSchema.safeParse(present);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .sort()
      .join("\n");

    // Only variable names and messages. Never the values.
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return result.data;
}

export const env = parseEnv(process.env);

export const isProduction = env.NODE_ENV === "production";

export const apiPublicUrl = env.API_PUBLIC_URL;

/** Must be registered verbatim in the Google Cloud console. */
export const googleCallbackUrl = `${apiPublicUrl}/auth/google/callback`;

export const isGoogleLoginEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);
