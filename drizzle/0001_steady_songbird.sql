CREATE TABLE "inventory_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text,
	"product_name" text,
	"change_amount" integer,
	"new_quantity" integer,
	"reason" text,
	"old_price" numeric,
	"new_price" numeric,
	"reference_id" text,
	"note" text,
	"operator" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "token_blacklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text,
	"revoked_at" timestamp DEFAULT now(),
	"user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "destination" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "cost" numeric;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "date" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sessions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_email_sent" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_joined" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "use_default_github" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text;