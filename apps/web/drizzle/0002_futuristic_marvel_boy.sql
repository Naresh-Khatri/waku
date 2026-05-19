CREATE TABLE "anon_link" (
	"anon_user_id" text PRIMARY KEY NOT NULL,
	"target_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"document_json" jsonb NOT NULL,
	"thumbnail_key" text,
	"published_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_template_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "template_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "template_category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "waku_ai_generation" RENAME TO "ai_generation";--> statement-breakpoint
ALTER TABLE "waku_asset" RENAME TO "asset";--> statement-breakpoint
ALTER TABLE "waku_credit_balance" RENAME TO "credit_balance";--> statement-breakpoint
ALTER TABLE "waku_credit_ledger" RENAME TO "credit_ledger";--> statement-breakpoint
ALTER TABLE "waku_render_log" RENAME TO "render_log";--> statement-breakpoint
ALTER TABLE "waku_template" RENAME TO "template";--> statement-breakpoint
ALTER TABLE "waku_template_version" RENAME TO "template_version";--> statement-breakpoint
ALTER TABLE "waku_user_profile" RENAME TO "user_profile";--> statement-breakpoint
ALTER TABLE "waku_user_secret" RENAME TO "user_secret";--> statement-breakpoint
ALTER TABLE "user_profile" DROP CONSTRAINT "waku_user_profile_handle_unique";--> statement-breakpoint
ALTER TABLE "ai_generation" DROP CONSTRAINT "waku_ai_generation_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "asset" DROP CONSTRAINT "waku_asset_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_balance" DROP CONSTRAINT "waku_credit_balance_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_ledger" DROP CONSTRAINT "waku_credit_ledger_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "render_log" DROP CONSTRAINT "waku_render_log_template_version_id_waku_template_version_id_fk";
--> statement-breakpoint
ALTER TABLE "template" DROP CONSTRAINT "waku_template_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "template_version" DROP CONSTRAINT "waku_template_version_template_id_waku_template_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profile" DROP CONSTRAINT "waku_user_profile_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_secret" DROP CONSTRAINT "waku_user_secret_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "waku_ai_generation_user_idx";--> statement-breakpoint
DROP INDEX "waku_credit_ledger_user_idx";--> statement-breakpoint
DROP INDEX "waku_render_log_tv_idx";--> statement-breakpoint
DROP INDEX "waku_render_log_created_at_idx";--> statement-breakpoint
DROP INDEX "waku_template_user_slug_idx";--> statement-breakpoint
DROP INDEX "waku_template_version_idx";--> statement-breakpoint
DROP INDEX "waku_template_version_template_idx";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_anonymous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "render_log" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "render_log" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "thumbnail_key" text;--> statement-breakpoint
ALTER TABLE "template" ADD COLUMN "thumbnail_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "template_version" ADD COLUMN "label" text;--> statement-breakpoint
ALTER TABLE "template_version" ADD COLUMN "document_json" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "anon_link" ADD CONSTRAINT "anon_link_anon_user_id_user_id_fk" FOREIGN KEY ("anon_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anon_link" ADD CONSTRAINT "anon_link_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_conversation" ADD CONSTRAINT "chat_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_conversation_id_chat_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_template" ADD CONSTRAINT "stock_template_category_id_template_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."template_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_template" ADD CONSTRAINT "stock_template_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anon_link_status_idx" ON "anon_link" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "chat_conversation_user_idx" ON "chat_conversation" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "chat_message_conversation_idx" ON "chat_message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_template_category_idx" ON "stock_template" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "stock_template_published_idx" ON "stock_template" USING btree ("published_at");--> statement-breakpoint
ALTER TABLE "ai_generation" ADD CONSTRAINT "ai_generation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_balance" ADD CONSTRAINT "credit_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_log" ADD CONSTRAINT "render_log_template_version_id_template_version_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."template_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "render_log" ADD CONSTRAINT "render_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template" ADD CONSTRAINT "template_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_version" ADD CONSTRAINT "template_version_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_secret" ADD CONSTRAINT "user_secret_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_generation_user_idx" ON "ai_generation" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_idx" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "render_log_tv_idx" ON "render_log" USING btree ("template_version_id");--> statement-breakpoint
CREATE INDEX "render_log_created_at_idx" ON "render_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "render_log_user_idx" ON "render_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "template_user_slug_idx" ON "template" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "template_version_idx" ON "template_version" USING btree ("template_id","version");--> statement-breakpoint
CREATE INDEX "template_version_template_idx" ON "template_version" USING btree ("template_id");--> statement-breakpoint
ALTER TABLE "template_version" DROP COLUMN "ir_json";--> statement-breakpoint
ALTER TABLE "template_version" DROP COLUMN "params_schema_json";--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_handle_unique" UNIQUE("handle");