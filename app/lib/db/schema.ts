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
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  roles: text("roles").array().default(["user"]),
  isActive: boolean("is_active").default(false),
  sessions: jsonb("sessions").default([]),
  dateJoined: timestamp("date_joined").defaultNow(),
  lastLogin: timestamp("last_login"),
  lastEmailSent: timestamp("last_email_sent"),
  useDefaultGithub: boolean("use_default_github").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").default(""),
  price: numeric("price", { precision: 10, scale: 2 }),
  category: text("category").array().default([]),
  productType: text("product_type").notNull(),
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
  invoiceNumber: text("invoice_number").notNull().unique(),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customer: text("customer"),
  items: jsonb("items").notNull().default([]),
  amount: numeric("amount", { precision: 10, scale: 2 }).default("0"),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
  deposit: numeric("deposit", { precision: 10, scale: 2 }).default("0"),
  depositCurrency: text("deposit_currency").default("EGP"),
  paymentMethod: text("payment_method").default("cash"),
  date: text("date"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").unique().default("main"),
  userId: uuid("user_id").references(() => users.id),
  balance: numeric("balance", { precision: 10, scale: 2 }).default("0"),
  balanceEgp: numeric("balance_egp", { precision: 10, scale: 2 }).default("0"),
  balanceUsd: numeric("balance_usd", { precision: 10, scale: 2 }).default("0"),
  balanceEur: numeric("balance_eur", { precision: 10, scale: 2 }).default("0"),
  initialized: boolean("initialized").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").references(() => wallet.id),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("EGP"),
  description: text("description").default(""),
  note: text("note"),
  date: timestamp("date").defaultNow(),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier").default(""),
  status: text("status").default("pending"),
  destination: text("destination"),
  cost: numeric("cost", { precision: 10, scale: 2 }).default("0"),
  description: text("description").default(""),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  changeAmount: integer("change_amount").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  reason: text("reason").notNull(),
  oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
  newPrice: numeric("new_price", { precision: 10, scale: 2 }),
  referenceId: text("reference_id"),
  note: text("note"),
  operator: text("operator"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const blacklistTokens = pgTable("blacklist_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
