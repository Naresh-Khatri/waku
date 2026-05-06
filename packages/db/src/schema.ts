import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Node, ParamsSchema } from "@waku/ir";

import { account, session, user } from "./auth-schema";

/**
 * Public handle for a user. Immutable in v1 — every render URL embeds it.
 * Decoupled from better-auth's `user` table so its migrations don't collide.
 */
export const wakuUserProfile = pgTable("waku_user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wakuTemplate = pgTable(
  "waku_template",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    publishedVersionId: uuid("published_version_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("waku_template_user_slug_idx").on(t.userId, t.slug)],
);

export const wakuTemplateVersion = pgTable(
  "waku_template_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => wakuTemplate.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    irJson: jsonb("ir_json").$type<Node>().notNull(),
    paramsSchemaJson: jsonb("params_schema_json")
      .$type<ParamsSchema>()
      .notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("waku_template_version_idx").on(t.templateId, t.version),
    index("waku_template_version_template_idx").on(t.templateId),
  ],
);

export const wakuRenderLog = pgTable(
  "waku_render_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateVersionId: uuid("template_version_id")
      .notNull()
      .references(() => wakuTemplateVersion.id, { onDelete: "cascade" }),
    paramsHash: text("params_hash").notNull(),
    format: text("format").notNull(),
    ms: integer("ms").notNull(),
    status: integer("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("waku_render_log_tv_idx").on(t.templateVersionId),
    index("waku_render_log_created_at_idx").on(t.createdAt),
  ],
);

export const wakuAsset = pgTable("waku_asset", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  storageKey: text("storage_key").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wakuUserSecret = pgTable("waku_user_secret", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  hmacKey: text("hmac_key").notNull(),
  rotatedAt: timestamp("rotated_at").defaultNow().notNull(),
});

export const userRelations = relations(user, ({ many, one }) => ({
  account: many(account),
  session: many(session),
  profile: one(wakuUserProfile, {
    fields: [user.id],
    references: [wakuUserProfile.userId],
  }),
  templates: many(wakuTemplate),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const wakuTemplateRelations = relations(
  wakuTemplate,
  ({ one, many }) => ({
    user: one(user, { fields: [wakuTemplate.userId], references: [user.id] }),
    versions: many(wakuTemplateVersion),
    publishedVersion: one(wakuTemplateVersion, {
      fields: [wakuTemplate.publishedVersionId],
      references: [wakuTemplateVersion.id],
    }),
  }),
);

export const wakuTemplateVersionRelations = relations(
  wakuTemplateVersion,
  ({ one }) => ({
    template: one(wakuTemplate, {
      fields: [wakuTemplateVersion.templateId],
      references: [wakuTemplate.id],
    }),
  }),
);
