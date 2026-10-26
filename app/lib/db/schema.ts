import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(),
  email: text("email").unique(),
  password: text("password"),
  roles: text("roles").array().default(["user"]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  sessions: jsonb("sessions").default([]),
  lastEmailSent: timestamp("last_email_sent"),
  lastLogin: timestamp("last_login"),
  dateJoined: timestamp("date_joined"),
  useDefaultGithub: boolean("use_default_github"),
  firstName: text("first_name"),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
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
  quantity: integer("quantity").default(0),
  images: text("images").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").unique(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  items: jsonb("items"),
  totalAmount: numeric("total_amount"),
  currency: text("currency").default("EGP"),
  status: text("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  balanceEGP: numeric("balance_egp").default("0"),
  balanceUSD: numeric("balance_usd").default("0"),
  balanceEUR: numeric("balance_eur").default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").references(() => wallet.id),
  type: text("type"),
  amount: numeric("amount"),
  currency: text("currency"),
  description: text("description"),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: text("product_id"),
  productName: text("product_name"),
  changeAmount: integer("change_amount"),
  newQuantity: integer("new_quantity"),
  reason: text("reason"),
  oldPrice: numeric("old_price"),
  newPrice: numeric("new_price"),
  referenceId: text("reference_id"),
  note: text("note"),
  operator: text("operator"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const tokenBlacklist = pgTable("token_blacklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token"),
  revokedAt: timestamp("revoked_at").defaultNow(),
  userId: uuid("user_id"),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  status: text("status").default("pending"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  destination: text("destination"),
  cost: numeric("cost"),
  description: text("description"),
  date: text("date"),
});

