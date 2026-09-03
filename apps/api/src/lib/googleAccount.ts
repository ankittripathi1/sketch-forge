import { db, oauthAccounts, userTable } from "@repo/db";
import { and, eq } from "drizzle-orm";

export const GOOGLE_PROVIDER = "google";

export type GoogleProfile = {
  googleId: string;
  /** Only ever passed in after `email_verified` has been checked. */
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
};

/**
 * Resolves the local user for a Google profile, creating or linking as needed.
 *
 * Runs as one transaction so a concurrent sign-in cannot produce two users for
 * the same Google account or two links for the same `(provider, id)` pair.
 * Linking by email is only safe because the caller has already confirmed Google
 * marked the address verified.
 */
export async function resolveGoogleUser(
  profile: GoogleProfile,
): Promise<string> {
  return db.transaction(async (tx) => {
    const [linked] = await tx
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(
        and(
          eq(oauthAccounts.provider, GOOGLE_PROVIDER),
          eq(oauthAccounts.providerAccountId, profile.googleId),
        ),
      )
      .limit(1);

    if (linked?.userId) {
      return linked.userId;
    }

    const [existing] = await tx
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, profile.email))
      .limit(1);

    const userId =
      existing?.id ??
      (
        await tx
          .insert(userTable)
          .values({
            email: profile.email,
            name: profile.name ?? null,
            avatarUrl: profile.avatarUrl ?? null,
          })
          .returning({ id: userTable.id })
      )[0]!.id;

    await tx.insert(oauthAccounts).values({
      userId,
      provider: GOOGLE_PROVIDER,
      providerAccountId: profile.googleId,
    });

    return userId;
  });
}
