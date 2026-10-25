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
  password: text("password").notNull(),
  roles: text("roles").array().default(["user"]),
  isActive: boolean("is_active").default(true),
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
  invoiceNumber: text("invoice_number").unique().notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  items: jsonb("items").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .unique()
    .notNull(),
  balanceEGP: numeric("balance_egp", { precision: 12, scale: 2 }).default("0"),
  balanceUSD: numeric("balance_usd", { precision: 12, scale: 2 }).default("0"),
  balanceEUR: numeric("balance_eur", { precision: 12, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  description: text("description"),
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id"),
  productName: text("product_name"),
  changeType: text("change_type"),
  quantityChange: integer("quantity_change"),
  previousQuantity: integer("previous_quantity"),
  newQuantity: integer("new_quantity"),
  performedBy: text("performed_by"),
  oldPrice: numeric("old_price", { precision: 10, scale: 2 }),
  newPrice: numeric("new_price", { precision: 10, scale: 2 }),
  referenceId: text("reference_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tokenBlacklist = pgTable("token_blacklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token").notNull(),
  userId: uuid("user_id").references(() => users.id),
  revokedAt: timestamp("revoked_at").defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  customerName: text("customer_name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  status: text("status").default("pending"),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
