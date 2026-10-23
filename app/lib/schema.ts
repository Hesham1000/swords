import {
  pgTable,
  uuid,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
  date,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  roles: text("roles").array().notNull().default([]),
  sessions: jsonb("sessions").notNull().default([]),
  dateJoined: timestamp("date_joined").notNull().defaultNow(),
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
  hand: text("hand"),
  isKings: boolean("is_kings"),
  isMini: boolean("is_mini"),
  lameColor: text("lame_color"),
  material: text("material"),
  gloveSize: text("glove_size"),
  quantity: integer("quantity").notNull().default(0),
  images: text("images").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: text("invoice_id").notNull().unique(),
  customer: text("customer"),
  amount: numeric("amount"),
  discount: numeric("discount"),
  status: text("status"),
  paymentMethod: text("payment_method"),
  date: date("date"),
  items: jsonb("items"),
  deposit: numeric("deposit"),
  depositCurrency: text("deposit_currency"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  balance: numeric("balance").notNull().default("0"),
  currency: text("currency").notNull().default("EGP"),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").references(() => wallet.id),
  type: text("type"),
  amount: numeric("amount"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  trackingNumber: text("tracking_number"),
  status: text("status"),
  carrier: text("carrier"),
  destination: text("destination"),
  cost: numeric("cost"),
  description: text("description"),
  date: date("date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  change: integer("change"),
  reason: text("reason"),
  productName: text("product_name"),
  newQuantity: integer("new_quantity"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tokenBlacklist = pgTable("token_blacklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  userId: uuid("user_id").references(() => users.id),
  revokedAt: timestamp("revoked_at").notNull().defaultNow(),
});
