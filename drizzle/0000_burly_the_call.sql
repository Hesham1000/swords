CREATE TABLE "inventory_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"change_type" text,
	"quantity_change" integer,
	"reason" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" text NOT NULL,
	"customer" text DEFAULT 'General Customer',
	"amount" numeric DEFAULT '0',
	"discount" numeric DEFAULT '0',
	"status" text DEFAULT 'pending',
	"payment_method" text DEFAULT 'cash',
	"date" text,
	"items" jsonb DEFAULT '[]'::jsonb,
	"deposit" numeric DEFAULT '0',
	"deposit_currency" text DEFAULT 'EGP',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invoices_invoice_id_unique" UNIQUE("invoice_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"price" numeric,
	"category" text[] DEFAULT '{}',
	"product_type" text,
	"brand" text DEFAULT '',
	"model" text DEFAULT '',
	"sub_category" text,
	"hand" text,
	"is_kings" boolean DEFAULT false,
	"is_mini" boolean DEFAULT false,
	"lame_color" text,
	"material" text,
	"glove_size" text,
	"quantity" integer DEFAULT 0,
	"images" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" text,
	"customer" text,
	"address" text,
	"status" text DEFAULT 'pending',
	"items" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"is_active" boolean DEFAULT false,
	"roles" text[] DEFAULT '{"user"}',
	"sessions" jsonb DEFAULT '[]'::jsonb,
	"date_joined" timestamp DEFAULT now(),
	"last_email_sent" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"balance" numeric DEFAULT '0',
	"currency" text DEFAULT 'EGP',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid,
	"type" text,
	"amount" numeric,
	"description" text DEFAULT '',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet"("id") ON DELETE no action ON UPDATE no action;