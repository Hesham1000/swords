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
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password"),
  isActive: boolean("is_active").default(false),
  roles: text("roles").array().default(["user"]),
  sessions: jsonb("sessions").default([]),
  dateJoined: timestamp("date_joined").defaultNow(),
  lastEmailSent: timestamp("last_email_sent"),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").default(""),
  price: numeric("price"),
  category: text("category").array().default([]),
  productType: text("product_type"),
  brand: text("brand").default(""),
  model: text("model").default(""),
  subCategory: text("sub_category"),
  hand: text("hand"),
  isKings: boolean("is_kings").default(false),
  isMini: boolean("is_mini").default(false),
  lameColor: text("lame_color"),
  material: text("material"),
  gloveSize: text("glove_size"),
  quantity: integer("quantity").default(0),
  images: text("images").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: text("invoice_id").unique().notNull(),
  customer: text("customer").default("General Customer"),
  amount: numeric("amount").default("0"),
  discount: numeric("discount").default("0"),
  status: text("status").default("pending"),
  paymentMethod: text("payment_method").default("cash"),
  date: text("date"),
  items: jsonb("items").default([]),
  deposit: numeric("deposit").default("0"),
  depositCurrency: text("deposit_currency").default("EGP"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  balance: numeric("balance").default("0"),
  currency: text("currency").default("EGP"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").references(() => wallet.id),
  type: text("type"),
  amount: numeric("amount"),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: text("invoice_id"),
  customer: text("customer"),
  address: text("address"),
  status: text("status").default("pending"),
  items: jsonb("items").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blacklistTokens = pgTable("blacklist_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at"),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  changeType: text("change_type"),
  quantityChange: integer("quantity_change"),
  reason: text("reason").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});
