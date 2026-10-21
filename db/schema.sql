-- PostgreSQL schema for the swords app (migrated from MongoDB)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  username text UNIQUE,
  password text, -- password hash
  first_name text,
  name text,
  role text DEFAULT 'user',
  roles text[] DEFAULT '{user}',
  is_active boolean DEFAULT false,
  use_default_github boolean,
  sessions jsonb DEFAULT '[]'::jsonb,
  date_joined timestamptz,
  last_email_sent timestamptz,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ BLACKLISTED TOKENS ============
CREATE TABLE IF NOT EXISTS blacklist_tokens (
  token text PRIMARY KEY,
  user_id uuid,
  revoked_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- ============ PRODUCTS ============
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  description text,
  price numeric,
  category text[],
  product_type text,
  brand text,
  model text,
  sub_category text,
  is_kings boolean,
  is_mini boolean,
  lame_color text,
  material text,
  hand text,
  glove_size text,
  quantity integer DEFAULT 0,
  images text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products (product_type);

-- ============ INVOICES ============
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text UNIQUE,
  customer text,
  amount numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  payment_method text DEFAULT 'cash',
  date date,
  items jsonb DEFAULT '[]'::jsonb,
  deposit numeric DEFAULT 0,
  deposit_currency text DEFAULT 'EGP',
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (date);

-- ============ SHIPMENTS ============
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  tracking_number text,
  carrier text,
  status text,
  address jsonb,
  destination text,
  cost numeric,
  description text,
  date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ WALLET ============
CREATE TABLE IF NOT EXISTS wallet (
  id text PRIMARY KEY DEFAULT 'main',
  user_id uuid UNIQUE,
  balance numeric DEFAULT 0,
  balance_egp numeric DEFAULT 0,
  balance_usd numeric DEFAULT 0,
  balance_eur numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  initialized boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ WALLET TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id text,
  type text,
  amount numeric,
  currency text DEFAULT 'EGP',
  note text,
  status text DEFAULT 'completed',
  date timestamptz,
  reference_id text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions (wallet_id);

-- ============ INVENTORY LOGS ============
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  product_name text,
  change integer,
  change_amount integer,
  new_quantity integer,
  reason text,
  old_price numeric,
  new_price numeric,
  reference_id text,
  note text,
  operator text,
  "timestamp" timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON inventory_logs (product_id);
