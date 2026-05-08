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
import type { TemplateDocument } from "@waku/renderer/document";

import { account, session, user } from "./auth-schema";

export type TemplateDocumentRow = TemplateDocument;

/**
 * Public handle for a user. Immutable in v1 — every render URL embeds it.
 * Decoupled from better-auth's `user` table so its migrations don't collide.
 */
export const userProfile = pgTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const template = pgTable(
  "template",
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
  (t) => [uniqueIndex("template_user_slug_idx").on(t.userId, t.slug)],
);

export const templateVersion = pgTable(
  "template_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => template.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    documentJson: jsonb("document_json")
      .$type<TemplateDocumentRow>()
      .notNull(),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("template_version_idx").on(t.templateId, t.version),
    index("template_version_template_idx").on(t.templateId),
  ],
);

export const renderLog = pgTable(
  "render_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateVersionId: uuid("template_version_id")
      .notNull()
      .references(() => templateVersion.id, { onDelete: "cascade" }),
    paramsHash: text("params_hash").notNull(),
    format: text("format").notNull(),
    ms: integer("ms").notNull(),
    status: integer("status").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("render_log_tv_idx").on(t.templateVersionId),
    index("render_log_created_at_idx").on(t.createdAt),
  ],
);

export const asset = pgTable("asset", {
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

export const userSecret = pgTable("user_secret", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  hmacKey: text("hmac_key").notNull(),
  rotatedAt: timestamp("rotated_at").defaultNow().notNull(),
});

export const creditBalance = pgTable("credit_balance", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    refId: text("ref_id"),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("credit_ledger_user_idx").on(t.userId, t.createdAt),
  ],
);

export const chatConversation = pgTable(
  "chat_conversation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("chat_conversation_user_idx").on(t.userId, t.updatedAt),
  ],
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: text("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatConversation.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").$type<unknown[]>().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("chat_message_conversation_idx").on(
      t.conversationId,
      t.createdAt,
    ),
  ],
);

export const aiGeneration = pgTable(
  "ai_generation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    prompt: text("prompt").notNull(),
    inputJson: jsonb("input_json"),
    outputJson: jsonb("output_json"),
    creditsCharged: integer("credits_charged").notNull(),
    status: text("status").notNull(),
    error: text("error"),
    ms: integer("ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("ai_generation_user_idx").on(t.userId, t.createdAt),
  ],
);

export const userRelations = relations(user, ({ many, one }) => ({
  account: many(account),
  session: many(session),
  profile: one(userProfile, {
    fields: [user.id],
    references: [userProfile.userId],
  }),
  templates: many(template),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const templateRelations = relations(
  template,
  ({ one, many }) => ({
    user: one(user, { fields: [template.userId], references: [user.id] }),
    versions: many(templateVersion),
    publishedVersion: one(templateVersion, {
      fields: [template.publishedVersionId],
      references: [templateVersion.id],
    }),
  }),
);

export const templateVersionRelations = relations(
  templateVersion,
  ({ one }) => ({
    template: one(template, {
      fields: [templateVersion.templateId],
      references: [template.id],
    }),
  }),
);
