ALTER TABLE "render_log" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "render_log" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "render_log" ADD CONSTRAINT "render_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "render_log_user_idx" ON "render_log" USING btree ("user_id","created_at");
