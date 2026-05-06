CREATE TABLE "waku_ai_generation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"prompt" text NOT NULL,
	"input_json" jsonb,
	"output_json" jsonb,
	"credits_charged" integer NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waku_credit_balance" (
	"user_id" text PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waku_credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref_id" text,
	"balance_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waku_ai_generation" ADD CONSTRAINT "waku_ai_generation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waku_credit_balance" ADD CONSTRAINT "waku_credit_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waku_credit_ledger" ADD CONSTRAINT "waku_credit_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waku_ai_generation_user_idx" ON "waku_ai_generation" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "waku_credit_ledger_user_idx" ON "waku_credit_ledger" USING btree ("user_id","created_at");