import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  roles: text("roles").array().default(["user"]).notNull(),
  sessions: jsonb("sessions").default([]).notNull(),
  dateJoined: timestamp("date_joined").defaultNow().notNull(),
  lastEmailSent: timestamp("last_email_sent"),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price"),
  category: text("category").array(),
  productType: text("product_type"),
  brand: text("brand"),
  model: text("model"),
  subCategory: text("sub_category"),
  isKings: boolean("is_kings"),
  isMini: boolean("is_mini"),
  lameColor: text("lame_color"),
  material: text("material"),
  hand: text("hand"),
  gloveSize: text("glove_size"),
  quantity: integer("quantity"),
  images: text("images").array(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  items: jsonb("items"),
  total: numeric("total"),
  status: text("status"),
  paymentMethod: text("payment_method").default("cash"),
  discount: numeric("discount").default("0"),
  deposit: numeric("deposit").default("0"),
  depositCurrency: text("deposit_currency").default("EGP"),
  invoiceDate: text("invoice_date"),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  balance: numeric("balance").default("0").notNull(),
  balanceEGP: numeric("balance_egp").default("0").notNull(),
  balanceUSD: numeric("balance_usd").default("0").notNull(),
  balanceEUR: numeric("balance_eur").default("0").notNull(),
  initialized: boolean("initialized").default(false).notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").references(() => wallet.id),
  type: text("type"),
  amount: numeric("amount"),
  description: text("description"),
  currency: text("currency").default("EGP"),
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at"),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  status: text("status"),
  createdAt: timestamp("created_at"),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  change: integer("change"),
  reason: text("reason"),
  createdAt: timestamp("created_at"),
});
