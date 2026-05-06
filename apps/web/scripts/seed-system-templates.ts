import { eq, and } from "drizzle-orm";
import {
  user,
  wakuTemplate,
  wakuTemplateVersion,
  wakuUserProfile,
} from "@waku/db";
import { systemTemplates } from "@waku/templates";

import { db } from "@/server/db";

const SYSTEM_USER_ID = "system";
const SYSTEM_USER_HANDLE = "waku";

async function ensureSystemUser() {
  const existing = await db.query.user.findFirst({
    where: eq(user.id, SYSTEM_USER_ID),
  });
  if (!existing) {
    await db.insert(user).values({
      id: SYSTEM_USER_ID,
      name: "Waku",
      email: "system@waku.local",
      emailVerified: true,
    });
    console.log(`created system user (${SYSTEM_USER_ID})`);
  } else {
    console.log(`system user already exists`);
  }

  const profile = await db.query.wakuUserProfile.findFirst({
    where: eq(wakuUserProfile.userId, SYSTEM_USER_ID),
  });
  if (!profile) {
    await db.insert(wakuUserProfile).values({
      userId: SYSTEM_USER_ID,
      handle: SYSTEM_USER_HANDLE,
    });
    console.log(`created system profile (handle=${SYSTEM_USER_HANDLE})`);
  }
}

async function seedTemplate(t: (typeof systemTemplates)[number]) {
  const existingTemplate = await db.query.wakuTemplate.findFirst({
    where: and(
      eq(wakuTemplate.userId, SYSTEM_USER_ID),
      eq(wakuTemplate.slug, t.slug),
    ),
  });

  let templateId: string;
  if (existingTemplate) {
    templateId = existingTemplate.id;
    console.log(`  ${t.slug}: template row exists (${templateId})`);
  } else {
    const [row] = await db
      .insert(wakuTemplate)
      .values({
        userId: SYSTEM_USER_ID,
        slug: t.slug,
        name: t.name,
      })
      .returning({ id: wakuTemplate.id });
    if (!row) throw new Error("insert returned no row");
    templateId = row.id;
    console.log(`  ${t.slug}: created template (${templateId})`);
  }

  const existingVersion = await db.query.wakuTemplateVersion.findFirst({
    where: and(
      eq(wakuTemplateVersion.templateId, templateId),
      eq(wakuTemplateVersion.version, t.version),
    ),
  });

  let versionId: string;
  if (existingVersion) {
    versionId = existingVersion.id;
    await db
      .update(wakuTemplateVersion)
      .set({ irJson: t.ir, paramsSchemaJson: t.params })
      .where(eq(wakuTemplateVersion.id, versionId));
    console.log(`  ${t.slug}: refreshed v${t.version} (${versionId})`);
  } else {
    const [row] = await db
      .insert(wakuTemplateVersion)
      .values({
        templateId,
        version: t.version,
        irJson: t.ir,
        paramsSchemaJson: t.params,
        publishedAt: new Date(),
      })
      .returning({ id: wakuTemplateVersion.id });
    if (!row) throw new Error("insert returned no row");
    versionId = row.id;
    console.log(`  ${t.slug}: created v${t.version} (${versionId})`);
  }

  await db
    .update(wakuTemplate)
    .set({ publishedVersionId: versionId, updatedAt: new Date() })
    .where(eq(wakuTemplate.id, templateId));
}

async function main() {
  console.log("seeding system templates...");
  await ensureSystemUser();
  for (const t of systemTemplates) {
    await seedTemplate(t);
  }
  console.log(`done (${systemTemplates.length} templates)`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
