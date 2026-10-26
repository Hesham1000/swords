CREATE TABLE "inventory_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text,
	"product_name" text,
	"change_amount" integer DEFAULT 0,
	"new_quantity" integer DEFAULT 0,
	"reason" text,
	"old_price" numeric(10, 2),
	"new_price" numeric(10, 2),
	"reference_id" text,
	"note" text,
	"operator" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "customer_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "payment_method" text DEFAULT 'cash';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "date" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deposit" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "deposit_currency" text DEFAULT 'EGP';--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "destination" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "date" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_email_sent" timestamp;--> statement-breakpoint
ALTER TABLE "blacklist_tokens" DROP COLUMN "expires_at";