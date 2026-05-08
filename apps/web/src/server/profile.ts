import "server-only";

import { eq } from "drizzle-orm";
import { userProfile } from "@waku/db";

import { db } from "@/server/db";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]*$/;
const slugify = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "user";

export async function ensureProfile(user: {
  id: string;
  name: string;
  email: string;
}): Promise<{ handle: string }> {
  const existing = await db.query.userProfile.findFirst({
    where: eq(userProfile.userId, user.id),
  });
  if (existing) return { handle: existing.handle };

  const baseHandle = slugify(user.name || user.email.split("@")[0] || user.id);
  let handle = baseHandle;
  let suffix = 0;
  while (true) {
    const conflict = await db.query.userProfile.findFirst({
      where: eq(userProfile.handle, handle),
      columns: { userId: true },
    });
    if (!conflict) break;
    suffix += 1;
    handle = `${baseHandle}-${suffix}`;
  }
  if (!HANDLE_RE.test(handle)) handle = `user-${user.id.slice(0, 8)}`;

  await db
    .insert(userProfile)
    .values({ userId: user.id, handle })
    .onConflictDoNothing();
  return { handle };
}
