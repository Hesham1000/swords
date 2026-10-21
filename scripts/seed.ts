/**
 * Idempotent seed script for the swords app (PostgreSQL).
 *
 * Run: yarn seed   (tsx scripts/seed.ts)
 *
 * Idempotency strategy:
 *  - users:        ON CONFLICT (email) DO NOTHING
 *  - products:     ON CONFLICT (name) DO NOTHING  (name is indexed; conflict
 *                  target works because names are unique in seed data)
 *  - invoices:     ON CONFLICT (invoice_id) DO NOTHING
 *  - wallet:       ON CONFLICT (user_id) DO NOTHING
 *  - shipments / wallet_transactions / inventory_logs have no unique
 *    constraints, so previously seeded rows (identifiable by SEED- tagged
 *    reference ids / tracking numbers) are deleted before re-inserting.
 */
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { query, getPool } from "../app/lib/db";

// ---- Load .env manually (dotenv is not a dependency) -----------------------
(function loadEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
})();

type ProductSeed = {
  name: string;
  description: string;
  price: string;
  category: string[];
  product_type: string;
  brand: string;
  model: string;
  sub_category: string;
  is_kings: boolean;
  is_mini: boolean;
  lame_color: string | null;
  material: string;
  hand: string;
  glove_size: string | null;
  quantity: number;
};

const PRODUCTS: ProductSeed[] = [
  { name: "Absolute AF Foil Complete Weapon", description: "Complete electric foil with AF blade and French grip.", price: "2450.00", category: ["Foil"], product_type: "Complete Weapon", brand: "Absolute", model: "AF Elite", sub_category: "Electric Foil", is_kings: false, is_mini: false, lame_color: null, material: "Maraging Steel", hand: "Right", glove_size: null, quantity: 24 },
  { name: "Uhlmann FIE Sabre Blade", description: "FIE-certified sabre blade, 88cm.", price: "1180.00", category: ["Sabre"], product_type: "Blade", brand: "Uhlmann", model: "FIE S2000", sub_category: "Blade", is_kings: false, is_mini: false, lame_color: null, material: "Maraging Steel", hand: "Right", glove_size: null, quantity: 40 },
  { name: "Leon Paul EPÉE Blade Vniti", description: "Lightweight Vniti epee blade for senior competition.", price: "1320.00", category: ["Epée"], product_type: "Blade", brand: "Leon Paul", model: "Vniti", sub_category: "Blade", is_kings: false, is_mini: false, lame_color: null, material: "Maraging Steel", hand: "Left", glove_size: null, quantity: 18 },
  { name: "Absolute Sabre Lame Kings", description: "Kings-line conductive sabre lamé, 350N.", price: "1950.00", category: ["Sabre"], product_type: "Jacket", brand: "Absolute", model: "Kings Lamé", sub_category: "Lamé", is_kings: true, is_mini: false, lame_color: "Silver", material: "Stainless Steel Lamé", hand: "Right", glove_size: null, quantity: 12 },
  { name: "Uhlmann Mini Foil Mask", description: "Entry-level mask sized for junior fencers.", price: "890.00", category: ["Foil"], product_type: "Mask", brand: "Uhlmann", model: "Mini Classic", sub_category: "Mask", is_kings: false, is_mini: true, lame_color: null, material: "Steel Mesh", hand: "Right", glove_size: null, quantity: 30 },
  { name: "Negrini Epee Glove", description: "CE 350N padded epee glove with reinforced cuff.", price: "420.00", category: ["Epée"], product_type: "Glove", brand: "Negrini", model: "Pro Grip", sub_category: "Glove", is_kings: false, is_mini: false, lame_color: null, material: "Leather", hand: "Right", glove_size: "8", quantity: 50 },
  { name: "Leon Paul Sabre Glove Left", description: "Left-hand sabre glove with full cuff coverage.", price: "465.00", category: ["Sabre"], product_type: "Glove", brand: "Leon Paul", model: "Airflow", sub_category: "Glove", is_kings: false, is_mini: false, lame_color: null, material: "Leather", hand: "Left", glove_size: "9", quantity: 15 },
  { name: "Absolute Foil Jacket 350N", description: "Lightweight 350N foil jacket, unisex cut.", price: "1680.00", category: ["Foil"], product_type: "Jacket", brand: "Absolute", model: "Fusion", sub_category: "Jacket", is_kings: false, is_mini: false, lame_color: null, material: "Cotton/Poly Blend", hand: "Right", glove_size: null, quantity: 22 },
  { name: "Uhlmann Epee Complete Weapon", description: "Complete epee with pistol grip and FIE blade.", price: "2750.00", category: ["Epée"], product_type: "Complete Weapon", brand: "Uhlmann", model: "Champion", sub_category: "Electric Epee", is_kings: false, is_mini: false, lame_color: null, material: "Maraging Steel", hand: "Right", glove_size: null, quantity: 10 },
  { name: "Negrini Mini Sabre Lamé", description: "Conductive sabre lamé for kids, mini sizing.", price: "990.00", category: ["Sabre"], product_type: "Jacket", brand: "Negrini", model: "Mini Lamé", sub_category: "Lamé", is_kings: false, is_mini: true, lame_color: "Silver", material: "Stainless Steel Lamé", hand: "Right", glove_size: null, quantity: 20 },
  { name: "Leon Paul Foil Mask 350N", description: "Competition foil mask with detachable bib.", price: "1450.00", category: ["Foil"], product_type: "Mask", brand: "Leon Paul", model: "X-Change", sub_category: "Mask", is_kings: false, is_mini: false, lame_color: null, material: "Steel Mesh", hand: "Right", glove_size: null, quantity: 16 },
  { name: "Absolute Epee Bell Guard", description: "Standard epee bell guard with pad and nut.", price: "310.00", category: ["Epée"], product_type: "Blade", brand: "Absolute", model: "Guard Pro", sub_category: "Guard", is_kings: false, is_mini: false, lame_color: null, material: "Aluminium", hand: "Right", glove_size: null, quantity: 35 },
];

async function seedUsers(): Promise<string[]> {
  const adminHash = await bcrypt.hash("Admin123!", 10);
  const userHash = await bcrypt.hash("User123!", 10);
  await query(
    `INSERT INTO users (email, username, password, first_name, name, role, roles, is_active, date_joined)
     VALUES ($1,$2,$3,$4,$5,'admin','{admin}',true,now()), ($6,$7,$8,$9,$10,'user','{user}',true,now())
     ON CONFLICT (email) DO NOTHING`,
    [
      "admin@swords.com", "admin", adminHash, "Admin", "Admin User",
      "user@swords.com", "fencer", userHash, "Test", "Test User",
    ]
  );
  const res = await query<{ id: string; email: string }>(
    `SELECT id, email FROM users WHERE email IN ('admin@swords.com','user@swords.com')`
  );
  const admin = res.rows.find((r) => r.email === "admin@swords.com")!;
  return [admin.id];
}

async function seedWallet(adminId: string): Promise<string> {
  await query(
    `INSERT INTO wallet (id, user_id, balance, balance_egp, balance_usd, balance_eur, currency, initialized)
     VALUES ('main', $1, 58000, 50000, 5000, 3000, 'EGP', true)
     ON CONFLICT (user_id) DO NOTHING`,
    [adminId]
  );
  const res = await query<{ id: string }>(`SELECT id FROM wallet WHERE user_id = $1`, [adminId]);
  return res.rows[0].id;
}

async function seedProducts(): Promise<string[]> {
  for (const p of PRODUCTS) {
    // products.name is indexed but not UNIQUE, so ON CONFLICT (name) can't be
    // used as an arbiter — check existence first instead.
    const existing = await query<{ id: string }>(
      `SELECT id FROM products WHERE name = $1 LIMIT 1`, [p.name]
    );
    if (existing.rows.length > 0) continue;
    await query(
      `INSERT INTO products (name, description, price, category, product_type, brand, model,
         sub_category, is_kings, is_mini, lame_color, material, hand, glove_size, quantity, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'{}')`,
      [p.name, p.description, p.price, p.category, p.product_type, p.brand, p.model,
       p.sub_category, p.is_kings, p.is_mini, p.lame_color, p.material, p.hand, p.glove_size, p.quantity]
    );
  }
  const res = await query<{ id: string; name: string }>(
    `SELECT id, name FROM products WHERE name = ANY($1)`,
    [PRODUCTS.map((p) => p.name)]
  );
  return PRODUCTS.map((p) => res.rows.find((r) => r.name === p.name)!.id);
}

async function seedInvoices(adminId: string, productIds: string[]): Promise<string[]> {
  const statuses = ["pending", "paid", "shipped", "cancelled", "paid"];
  const invoiceIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const p1 = PRODUCTS[i], p2 = PRODUCTS[(i + 3) % PRODUCTS.length];
    const items = [
      { productId: productIds[i], name: p1.name, quantity: 2, price: Number(p1.price) },
      { productId: productIds[(i + 3) % productIds.length], name: p2.name, quantity: 1, price: Number(p2.price) },
    ];
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const tax = +(subtotal * 0.14).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const invoiceNumber = `INV-2026-000${i + 1}`;
    await query(
      `INSERT INTO invoices (invoice_id, customer, amount, discount, status, payment_method, date, items, deposit, deposit_currency, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'EGP',$10)
       ON CONFLICT (invoice_id) DO NOTHING`,
      [invoiceNumber, ["Ahmed Hassan", "Mona Adel", "Karim Fouad", "Sara Nabil", "Omar Zaki"][i],
       total, 0, statuses[i], ["cash", "card", "wallet", "cash", "card"][i],
       `2026-0${i + 1}-1${i}`, JSON.stringify(items), i === 0 ? 1000 : 0, adminId]
    );
    invoiceIds.push(invoiceNumber);
  }
  const res = await query<{ id: string; invoice_id: string }>(
    `SELECT id, invoice_id FROM invoices WHERE invoice_id = ANY($1)`, [invoiceIds]
  );
  return invoiceIds.map((n) => res.rows.find((r) => r.invoice_id === n)!.id);
}

async function seedShipments(invoiceUuids: string[]): Promise<void> {
  const tracking = ["SEED-DHL-8827100415", "SEED-FDX-7712035588", "SEED-ARX-5590123377"];
  const carriers = ["DHL", "FedEx", "Aramex"];
  const statuses = ["in_transit", "delivered", "pending"];
  const dests = ["Cairo, Egypt", "Alexandria, Egypt", "Giza, Egypt"];
  for (let i = 0; i < 3; i++) {
    // No unique constraint on shipments — clear prior seed rows first.
    await query(`DELETE FROM shipments WHERE tracking_number = $1`, [tracking[i]]);
    await query(
      `INSERT INTO shipments (invoice_id, tracking_number, carrier, status, address, destination, cost, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [invoiceUuids[i], tracking[i], carriers[i], statuses[i],
       JSON.stringify({ street: `${10 + i} Nile St`, city: dests[i].split(",")[0], country: "Egypt" }),
       dests[i], ["250.00", "300.00", "180.00"][i], `2026-0${i + 1}-2${i}`]
    );
  }
}

async function seedWalletTransactions(walletId: string): Promise<void> {
  // No unique constraint — clear prior seed rows first.
  await query(`DELETE FROM wallet_transactions WHERE reference_id LIKE 'SEED-WT-%'`);
  const types = ["deposit", "deposit", "withdrawal", "purchase", "deposit", "purchase", "withdrawal", "purchase"];
  const currencies = ["EGP", "USD", "EGP", "EGP", "EUR", "EGP", "USD", "EGP"];
  const amounts = ["5000.00", "1000.00", "750.00", "2450.00", "500.00", "1180.00", "300.00", "890.00"];
  for (let i = 0; i < 8; i++) {
    await query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, currency, note, status, date, reference_id)
       VALUES ($1,$2,$3,$4,$5,'completed',$6,$7)`,
      [walletId, types[i], amounts[i], currencies[i],
       `${types[i][0].toUpperCase() + types[i].slice(1)} — seed entry ${i + 1}`,
       new Date(Date.UTC(2026, i, 5 + i, 12)), `SEED-WT-${String(i + 1).padStart(2, "0")}`]
    );
  }
}

async function seedInventoryLogs(productIds: string[]): Promise<void> {
  // No unique constraint — clear prior seed rows first.
  await query(`DELETE FROM inventory_logs WHERE reference_id LIKE 'SEED-IL-%'`);
  const reasons = ["Restock", "Sale", "Damaged in shipping", "Return to stock", "Sale",
    "Restock", "Sale", "Inventory audit correction", "Sale", "Damaged in shipping"];
  for (let i = 0; i < 10; i++) {
    const pid = productIds[i % productIds.length];
    const change = [20, -2, -1, 1, -3, 15, -2, 4, -1, -1][i];
    const res = await query<{ quantity: number; name: string }>(
      `SELECT quantity, name FROM products WHERE id = $1`, [pid]
    );
    const { quantity, name } = res.rows[0];
    await query(
      `INSERT INTO inventory_logs (product_id, product_name, change, change_amount, new_quantity, reason, reference_id, operator, "timestamp")
       VALUES ($1,$2,$3,$3,$4,$5,$6,'admin',$7)`,
      [pid, name, change, quantity, reasons[i], `SEED-IL-${String(i + 1).padStart(2, "0")}`,
       new Date(Date.UTC(2026, i % 12, 3 + (i % 20), 10))]
    );
  }
}

async function main(): Promise<void> {
  const [adminId] = await seedUsers();
  const walletId = await seedWallet(adminId);
  const productIds = await seedProducts();
  const invoiceUuids = await seedInvoices(adminId, productIds);
  await seedShipments(invoiceUuids);
  await seedWalletTransactions(walletId);
  await seedInventoryLogs(productIds);

  const counts = await query<{ users: string; products: string; invoices: string; shipments: string; wallet: string; wallet_transactions: string; inventory_logs: string }>(
    `SELECT
       (SELECT count(*) FROM users) AS users,
       (SELECT count(*) FROM products) AS products,
       (SELECT count(*) FROM invoices) AS invoices,
       (SELECT count(*) FROM shipments) AS shipments,
       (SELECT count(*) FROM wallet) AS wallet,
       (SELECT count(*) FROM wallet_transactions) AS wallet_transactions,
       (SELECT count(*) FROM inventory_logs) AS inventory_logs`
  );
  console.log("Seed complete. Row counts:", counts.rows[0]);
  await getPool().end();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  try { await getPool().end(); } catch { /* ignore */ }
  process.exit(1);
});
