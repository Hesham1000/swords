import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(),
  email: text("email").unique(),
  password: text("password"),
  roles: text("roles").array().default(["user"]),
  isActive: boolean("is_active").default(false),
  useDefaultGithub: boolean("use_default_github"),
  firstName: text("first_name"),
  dateJoined: timestamp("date_joined"),
  lastEmailSent: timestamp("last_email_sent"),
  lastLogin: timestamp("last_login"),
  sessions: jsonb("sessions").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  isKings: boolean("is_kings").default(false),
  isMini: boolean("is_mini").default(false),
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
  userId: uuid("user_id").references(() => users.id),
  items: jsonb("items"),
  total: numeric("total"),
  invoiceId: text("invoice_id"),
  customer: text("customer"),
  amount: numeric("amount"),
  discount: numeric("discount"),
  paymentMethod: text("payment_method"),
  date: text("date"),
  deposit: numeric("deposit"),
  depositCurrency: text("deposit_currency"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wallet = pgTable("wallet", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .unique(),
  balance: numeric("balance").default("0"),
  balanceEGP: numeric("balance_egp").default("0"),
  balanceUSD: numeric("balance_usd").default("0"),
  balanceEUR: numeric("balance_eur").default("0"),
  initialized: boolean("initialized").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  amount: numeric("amount"),
  type: text("type"),
  description: text("description"),
  currency: text("currency"),
  note: text("note"),
  date: timestamp("date"),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  productId: uuid("product_id").references(() => products.id),
  quantity: integer("quantity"),
  status: text("status").default("pending"),
  destination: text("destination"),
  cost: numeric("cost"),
  description: text("description"),
  date: text("date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  userId: uuid("user_id").references(() => users.id),
  action: text("action"),
  quantityChange: integer("quantity_change"),
  productName: text("product_name"),
  reason: text("reason"),
  oldPrice: numeric("old_price"),
  newPrice: numeric("new_price"),
  referenceId: text("reference_id"),
  note: text("note"),
  operator: text("operator"),
  timestamp: timestamp("timestamp"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blacklistTokens = pgTable("blacklist_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: text("token"),
  userId: uuid("user_id").references(() => users.id),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
