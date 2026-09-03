import { db, folders } from "@repo/db";
import { and, eq } from "drizzle-orm";

/**
 * A Drizzle transaction handle. Ownership checks must run on the same handle as
 * the mutation they guard, otherwise the check and the write are not atomic.
 */
export type DbTransaction = Parameters<
  Parameters<(typeof db)["transaction"]>[0]
>[0];

/**
 * Upper bound on how far {@link createsFolderCycle} will walk a parent chain.
 * Only reached if the stored tree is already malformed, in which case the move
 * is refused rather than looped on.
 */
const MAX_FOLDER_DEPTH = 64;

/**
 * True when `folderId` exists and belongs to `userId`.
 *
 * Callers must treat `false` as "not found" so that a folder owned by another
 * user is indistinguishable from one that does not exist.
 */
export async function ownsFolder(
  tx: DbTransaction,
  folderId: string,
  userId: string,
): Promise<boolean> {
  const rows = await tx
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .limit(1);

  return rows.length > 0;
}

/**
 * True when re-parenting `folderId` under `parentId` would make the folder its
 * own ancestor. Walks up from `parentId` through folders owned by `userId`.
 */
export async function createsFolderCycle(
  tx: DbTransaction,
  folderId: string,
  parentId: string,
  userId: string,
): Promise<boolean> {
  let cursor: string | null = parentId;

  for (let depth = 0; cursor !== null && depth < MAX_FOLDER_DEPTH; depth++) {
    if (cursor === folderId) {
      return true;
    }

    const rows: { parentId: string | null }[] = await tx
      .select({ parentId: folders.parentId })
      .from(folders)
      .where(and(eq(folders.id, cursor), eq(folders.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      // The chain left this user's folders, so it cannot loop back into them.
      return false;
    }

    cursor = row.parentId;
  }

  // Ran out of depth with the chain still going: treat as a cycle.
  return cursor !== null;
}
