/**
 * Database seed script — idempotent (ON CONFLICT DO NOTHING).
 * Run with: npx tsx scripts/seed.ts
 */
import bcrypt from "bcryptjs";
import postgres from "postgres";
import { readFileSync } from "fs";

// Load .env (tsx does not auto-load it)
try {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

// Managed Postgres requires TLS with a self-signed cert — strip sslmode from
// the URL and disable CA verification explicitly.
const rawUrl = process.env.DATABASE_URL!;
const url = new URL(rawUrl);
url.searchParams.delete("sslmode");
const sql = postgres(url.toString(), {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 8,
});

async function upsertUsers() {
  const [adminPassword, managerPassword, userPassword] = await Promise.all([
    bcrypt.hash("admin123", 10),
    bcrypt.hash("manager123", 10),
    bcrypt.hash("user123", 10),
  ]);
  await sql`
    INSERT INTO users (username, email, password, roles, is_active) VALUES
      ('admin', '[REDACTED_EMAIL]', ${adminPassword}, ARRAY['admin']::text[], true),
      ('manager', '[REDACTED_EMAIL]', ${managerPassword}, ARRAY['manager']::text[], true),
      ('user', '[REDACTED_EMAIL]', ${userPassword}, ARRAY['user']::text[], true)
    ON CONFLICT DO NOTHING`;
  return sql`SELECT * FROM users WHERE username IN ('admin','manager','user')`;
}

const productRows: Array<[string, string, string, string[], string, number, string]> = [
  ["Allstar Foil Electric Lame", "lame", "Allstar", ["Foil"], "189.00", 8, "Electric foil lame, 800N nylon, FIE approved."],
  ["ProFencing Sabre Lame", "lame", "ProFencing", ["Sabre"], "165.50", 5, "Sabre lame with conductive coating."],
  ["Kings Body Wire 2-Pin", "body_wire", "Kings", ["Foil", "Epée"], "24.00", 40, "2-pin body wire, silicone insulated."],
  ["Allstar PBT Plastron", "pbt", "Allstar", ["Foil", "Sabre", "Epée"], "45.00", 25, "PBT plastron underarm protector, 350N."],
  ["ProFencing Epée Weapon Complete", "weapon", "ProFencing", ["Epée"], "135.00", 12, "Complete electric epée with pistol grip."],
  ["Kings Visconti Pistol Grip", "grip", "Kings", ["Epée", "Foil"], "22.00", 30, "Visconti-style pistol grip, aluminum."],
  ["Allstar Foil Bell Guard", "guard", "Allstar", ["Foil"], "28.00", 18, "Foil bell guard, stainless steel."],
  ["ProFencing Guard Padding", "guard_padding", "ProFencing", ["Foil", "Epée"], "8.50", 2, "Replacement guard padding."],
  ["Kings French Pommel", "french_pommel", "Kings", ["Foil", "Epée"], "12.00", 35, "French grip pommel nut, brass."],
  ["Allstar Barrel Nut", "nut", "Allstar", ["Epée"], "4.50", 100, "Epée point barrel nut."],
  ["ProFencing Epée Point", "point", "ProFencing", ["Epée"], "18.00", 1, "Complete epée point assembly."],
  ["Kings Point Contact Springs", "point_contact_springs", "Kings", ["Foil", "Epée"], "3.00", 2, "Set of point contact springs."],
  ["Allstar Bayonet Socket", "socket", "Allstar", ["Foil"], "9.00", 45, "Bayonet socket for body wire."],
  ["ProFencing Insulating Tube", "insulating_tube", "ProFencing", ["Epée"], "2.50", 60, "Insulating tube for epée blade."],
  ["Kings Cable 2m Spool", "cable", "Kings", ["Foil", "Sabre", "Epée"], "6.00", 80, "Internal wiring cable, 2m."],
  ["Allstar Crocodile Pin", "pin", "Allstar", ["Foil", "Epée"], "3.50", 90, "Crocodile clip pin connector."],
  ["ProFencing Sabre Cuff Glove", "glove", "ProFencing", ["Sabre"], "38.00", 22, "Sabre glove with conductive cuff."],
  ["Kings Screws Set (12pc)", "screws", "Kings", ["Foil", "Epée"], "5.00", 0, "Blade and guard screws, 12 pieces."],
];

async function upsertProducts() {
  for (const [name, type, brand, category, price, quantity, description] of productRows) {
    await sql`
      INSERT INTO products (name, product_type, brand, category, price, quantity, description)
      VALUES (${name}, ${type}, ${brand}, ${category}::text[], ${price}::numeric, ${quantity}, ${description})
      ON CONFLICT DO NOTHING`;
  }
  return sql`SELECT * FROM products`;
}

const invoiceRows: Array<[string, string, string, unknown, string, string]> = [
  ["INV-2024-0001", "Cairo Fencing Club", "club@cairofencing.eg",
    [{ name: "Allstar Foil Electric Lame", quantity: 2, price: 189.0 }, { name: "Kings Body Wire 2-Pin", quantity: 4, price: 24.0 }],
    "474.00", "paid"],
  ["INV-2024-0002", "Alexandria Fencing Academy", "info@alexfencing.eg",
    [{ name: "ProFencing Epée Weapon Complete", quantity: 3, price: 135.0 }],
    "385.00", "pending"],
  ["INV-2024-0003", "Hassan Mahmoud", "hassan.m@example.com",
    [{ name: "ProFencing Sabre Cuff Glove", quantity: 1, price: 38.0 }, { name: "Allstar PBT Plastron", quantity: 1, price: 45.0 }],
    "83.00", "paid"],
  ["INV-2024-0004", "Giza Fencing Center", "orders@gizafencing.eg",
    [{ name: "Allstar Foil Bell Guard", quantity: 5, price: 28.0 }, { name: "Kings French Pommel", quantity: 5, price: 12.0 }, { name: "Kings Screws Set (12pc)", quantity: 10, price: 5.0 }],
    "260.00", "shipped"],
  ["INV-2024-0005", "Nour El-Din", "nour.eldin@example.com",
    [{ name: "ProFencing Sabre Lame", quantity: 1, price: 165.5 }],
    "165.50", "shipped"],
];

async function upsertInvoices() {
  for (const [num, custName, custEmail, items, total, status] of invoiceRows) {
    await sql`
      INSERT INTO invoices (invoice_number, customer_name, customer_email, items, total_amount, status)
      VALUES (${num}, ${custName}, ${custEmail}, ${JSON.stringify(items)}::jsonb, ${total}::numeric, ${status})
      ON CONFLICT DO NOTHING`;
  }
  return sql`SELECT * FROM invoices`;
}

async function main() {
  console.log("Seeding database...");

  const seededUsers = await upsertUsers();
  const admin = seededUsers.find((u) => u.username === "admin");
  if (!admin) throw new Error("Admin user not found after upsert");

  const seededProducts = await upsertProducts();
  const seededInvoices = await upsertInvoices();

  // Wallet for admin (balance 5000.00)
  await sql`
    INSERT INTO wallet (user_id, balance)
    VALUES (${admin.id}::uuid, 5000.00::numeric)
    ON CONFLICT DO NOTHING`;
  const [adminWallet] = await sql`SELECT * FROM wallet WHERE user_id = ${admin.id}::uuid`;

  // 8 wallet transactions (deposits and withdrawals)
  const txRows: Array<[string, string, string, string]> = [
    ["deposit", "3000.00", "Initial capital deposit", "DEP-001"],
    ["deposit", "2500.00", "Invoice INV-2024-0001 payment", "INV-2024-0001"],
    ["withdrawal", "800.00", "Supplier restock payment", "SUP-014"],
    ["deposit", "385.00", "Invoice INV-2024-0002 deposit", "INV-2024-0002"],
    ["withdrawal", "450.00", "Shipping costs November", "SHP-NOV"],
    ["deposit", "83.00", "Invoice INV-2024-0003 payment", "INV-2024-0003"],
    ["withdrawal", "120.00", "Equipment maintenance", "MNT-007"],
    ["deposit", "425.50", "Invoice INV-2024-0005 payment", "INV-2024-0005"],
  ];
  for (const [type, amount, description, referenceId] of txRows) {
    await sql`
      INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
      VALUES (${adminWallet.id}::uuid, ${type}, ${amount}::numeric, ${description}, ${referenceId})
      ON CONFLICT DO NOTHING`;
  }

  // 4 shipments linked to invoices
  const shippable = seededInvoices.filter((i) => ["paid", "shipped"].includes(i.status ?? ""));
  const carriers = ["DHL", "Aramex", "FedEx", "Bosta"];
  for (let idx = 0; idx < Math.min(4, shippable.length); idx++) {
    const inv = shippable[idx];
    await sql`
      INSERT INTO shipments (invoice_id, tracking_number, carrier, status)
      VALUES (${inv.id}::uuid, ${`TRK-2024-${String(idx + 1).padStart(4, "0")}`}, ${carriers[idx]}, ${inv.status === "shipped" ? "in_transit" : "delivered"})
      ON CONFLICT DO NOTHING`;
  }

  // 10 inventory logs (purchase, sale, adjustment, damage)
  const reasons = ["purchase", "sale", "adjustment", "damage"] as const;
  for (let idx = 0; idx < 10 && idx < seededProducts.length; idx++) {
    const p = seededProducts[idx];
    const reason = reasons[idx % reasons.length];
    const changeAmount = reason === "sale" ? -(idx + 1) : reason === "damage" ? -1 : idx + 2;
    const newQuantity = Math.max(0, (p.quantity ?? 0) + changeAmount);
    await sql`
      INSERT INTO inventory_logs (product_id, product_name, change_amount, new_quantity, reason, old_price, new_price, reference_id, note)
      VALUES (${p.id}::uuid, ${p.name}, ${changeAmount}, ${newQuantity}, ${reason}, ${p.price}::numeric, ${p.price}::numeric, ${`LOG-${String(idx + 1).padStart(3, "0")}`}, ${`Stock ${reason} for ${p.name}`})
      ON CONFLICT DO NOTHING`;
  }

  console.log("Seed complete.");
  console.log(`Users: ${seededUsers.length}, Products: ${seededProducts.length}, Invoices: ${seededInvoices.length}`);
  await sql.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await sql.end().catch(() => {});
  process.exit(1);
});
