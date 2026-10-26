import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../app/lib/db";
import {
  users,
  products,
  invoices,
  wallet,
  walletTransactions,
  shipments,
} from "../app/lib/db/schema";
import { sql } from "drizzle-orm";

async function count(table: string): Promise<number> {
  const res = await db.execute(sql.raw(`SELECT COUNT(*)::int AS c FROM ${table}`));
  const rows = (res as any).rows ?? res;
  return Number(rows[0]?.c ?? 0);
}

async function main() {
  // ---- users ----
  let adminId: string;
  if ((await count("users")) > 0) {
    const existing = await db.select().from(users).limit(1);
    adminId = existing[0].id;
    console.log("users: already seeded, skipping");
  } else {
    adminId = randomUUID();
    const hashed = await bcrypt.hash("admin123", 10);
    await db.insert(users).values({
      id: adminId,
      username: "admin",
      email: "[REDACTED_EMAIL]",
      password: hashed,
      roles: ["admin"],
      isActive: true,
      firstName: "Admin",
    });
    console.log("users: seeded 1 user");
  }

  // ---- products ----
  if ((await count("products")) > 0) {
    console.log("products: already seeded, skipping");
  } else {
    const productRows = [
      { name: "Maraging Steel Lame - Foil", description: "FIE-grade maraging steel foil lame, 800N.", price: "2450.00", category: ["Clothing", "Lame"], productType: "Lame", brand: "PBT", model: "FIE-Foil", subCategory: "Foil", lameColor: "Silver", material: "Maraging Steel", quantity: 12 },
      { name: "Sabre Wire - 1.05mm", description: "High-conductivity sabre body wire, 1.05mm.", price: "85.00", category: ["Equipment", "Wires"], productType: "Wire", brand: "Absolute", model: "SW-105", subCategory: "Sabre", material: "Copper Alloy", quantity: 2 },
      { name: "PBT Grip - Right Hand", description: "Ergonomic pistol grip, right hand, visconte.", price: "320.00", category: ["Weapons", "Grips"], productType: "Grip", brand: "PBT", model: "VG-Right", subCategory: "Epee", hand: "Right", material: "Visconte", quantity: 25 },
      { name: "Kings Custom Guard", description: "Custom engraved epee guard, Kings series.", price: "560.00", category: ["Weapons", "Guards"], productType: "Guard", brand: "Kings", model: "KG-Custom", subCategory: "Epee", isKings: true, material: "Stainless Steel", quantity: 8 },
      { name: "Insulating Tube - Blue", description: "Insulating heat-shrink tube for wiring, blue.", price: "25.00", category: ["Equipment", "Parts"], productType: "Tube", brand: "Uhlmann", model: "IT-B", subCategory: "Wiring", material: "PVC", quantity: 1 },
      { name: "Point Contact Springs Set", description: "Set of 10 point contact springs for epee/foil.", price: "120.00", category: ["Equipment", "Parts"], productType: "Spring", brand: "Absolute", model: "PCS-10", subCategory: "Points", material: "Spring Steel", quantity: 40 },
      { name: "Body Wire - 0.8mm", description: "Standard body wire, 0.8mm, 2-pin.", price: "150.00", category: ["Equipment", "Wires"], productType: "Wire", brand: "Uhlmann", model: "BW-08", subCategory: "Foil", material: "Copper", quantity: 2 },
      { name: "French Pommel - Silver", description: "Classic French pommel, polished silver finish.", price: "180.00", category: ["Weapons", "Parts"], productType: "Pommel", brand: "Kings", model: "FP-S", subCategory: "Foil", isKings: true, material: "Brass", quantity: 18 },
      { name: "Glove Size 7.5 - Leather", description: "FIE leather fencing glove, size 7.5.", price: "420.00", category: ["Clothing", "Gloves"], productType: "Glove", brand: "PBT", model: "GL-75", subCategory: "Gloves", gloveSize: "7.5", material: "Leather", quantity: 15 },
      { name: "Cable - 1.2m", description: "Scoring machine connection cable, 1.2m.", price: "95.00", category: ["Equipment", "Cables"], productType: "Cable", brand: "Absolute", model: "CB-12", subCategory: "Scoring", material: "Copper", quantity: 30 },
      { name: "Pin Set - M4", description: "M4 pin set for body wire plugs.", price: "45.00", category: ["Equipment", "Parts"], productType: "Pin", brand: "Uhlmann", model: "PS-M4", subCategory: "Wiring", material: "Brass", quantity: 2 },
      { name: "Socket - 6mm", description: "6mm bayonet socket for masks and lames.", price: "110.00", category: ["Equipment", "Parts"], productType: "Socket", brand: "PBT", model: "SK-6", subCategory: "Wiring", material: "Brass", quantity: 22 },
    ];
    await db.insert(products).values(productRows.map((p) => ({ ...p, id: randomUUID() })));
    console.log("products: seeded 12 products");
  }

  // ---- invoices ----
  const invoiceIds: string[] = [];
  if ((await count("invoices")) > 0) {
    const existing = await db.select({ id: invoices.id }).from(invoices);
    invoiceIds.push(...existing.map((r) => r.id));
    console.log("invoices: already seeded, skipping");
  } else {
    const invoiceRows = [
      { invoiceNumber: "INV-2024-0001", customerName: "Ahmed Hassan", customerEmail: "ahmed.hassan@example.com", customerPhone: "+201001234567", items: [{ name: "Maraging Steel Lame - Foil", quantity: 1, price: 2450 }], totalAmount: "2450.00", currency: "EGP", status: "paid" },
      { invoiceNumber: "INV-2024-0002", customerName: "Sara Mahmoud", customerEmail: "sara.mahmoud@example.com", customerPhone: "+201009876543", items: [{ name: "Glove Size 7.5 - Leather", quantity: 2, price: 420 }, { name: "Body Wire - 0.8mm", quantity: 1, price: 150 }], totalAmount: "990.00", currency: "EGP", status: "pending" },
      { invoiceNumber: "INV-2024-0003", customerName: "Omar Fathy", customerEmail: "omar.fathy@example.com", customerPhone: "+201005551234", items: [{ name: "Kings Custom Guard", quantity: 1, price: 560 }, { name: "PBT Grip - Right Hand", quantity: 1, price: 320 }], totalAmount: "880.00", currency: "EGP", status: "shipped" },
      { invoiceNumber: "INV-2024-0004", customerName: "Laila Adel", customerEmail: "laila.adel@example.com", customerPhone: "+201003334455", items: [{ name: "Sabre Wire - 1.05mm", quantity: 5, price: 85 }], totalAmount: "425.00", currency: "EGP", status: "cancelled" },
      { invoiceNumber: "INV-2024-0005", customerName: "Karim Nabil", customerEmail: "karim.nabil@example.com", customerPhone: "+201007776655", items: [{ name: "Point Contact Springs Set", quantity: 2, price: 120 }, { name: "Socket - 6mm", quantity: 3, price: 110 }], totalAmount: "570.00", currency: "EGP", status: "paid" },
    ];
    const inserted = await db
      .insert(invoices)
      .values(invoiceRows.map((i) => ({ ...i, id: randomUUID() })))
      .returning({ id: invoices.id });
    invoiceIds.push(...inserted.map((r) => r.id));
    console.log("invoices: seeded 5 invoices");
  }

  // ---- wallet ----
  let walletId: string;
  if ((await count("wallet")) > 0) {
    const existing = await db.select().from(wallet).limit(1);
    walletId = existing[0].id;
    console.log("wallet: already seeded, skipping");
  } else {
    walletId = randomUUID();
    await db.insert(wallet).values({
      id: walletId,
      userId: adminId,
      balanceEGP: "50000",
      balanceUSD: "500",
      balanceEUR: "300",
    });
    console.log("wallet: seeded 1 wallet");
  }

  // ---- wallet transactions ----
  if ((await count("wallet_transactions")) > 0) {
    console.log("wallet_transactions: already seeded, skipping");
  } else {
    const txRows = [
      { type: "deposit", amount: "30000", currency: "EGP", description: "Initial wallet funding", referenceId: "DEP-001" },
      { type: "deposit", amount: "20000", currency: "EGP", description: "Deposit via bank transfer", referenceId: "DEP-002" },
      { type: "withdrawal", amount: "5000", currency: "EGP", description: "Supplier payment - PBT order", referenceId: "WDR-001" },
      { type: "deposit", amount: "400", currency: "USD", description: "USD deposit for imports", referenceId: "DEP-003" },
      { type: "withdrawal", amount: "150", currency: "USD", description: "Customs fees payment", referenceId: "WDR-002" },
      { type: "deposit", amount: "250", currency: "USD", description: "USD top-up", referenceId: "DEP-004" },
      { type: "deposit", amount: "300", currency: "EUR", description: "EUR deposit for European orders", referenceId: "DEP-005" },
      { type: "withdrawal", amount: "100", currency: "EUR", description: "Uhlmann order payment", referenceId: "WDR-003" },
    ];
    await db
      .insert(walletTransactions)
      .values(txRows.map((t) => ({ ...t, id: randomUUID(), walletId })));
    console.log("wallet_transactions: seeded 8 transactions");
  }

  // ---- shipments ----
  if ((await count("shipments")) > 0) {
    console.log("shipments: already seeded, skipping");
  } else {
    const shipmentRows = [
      { invoiceId: invoiceIds[0], trackingNumber: "TRK-EG-100234", carrier: "Aramex", status: "delivered", shippedAt: new Date("2024-11-03"), deliveredAt: new Date("2024-11-05"), destination: "Cairo, Egypt", cost: "120.00", description: "Foil lame shipment" },
      { invoiceId: invoiceIds[1], trackingNumber: "TRK-EG-100567", carrier: "Bosta", status: "pending", destination: "Giza, Egypt", cost: "80.00", description: "Gloves and body wire" },
      { invoiceId: invoiceIds[2], trackingNumber: "TRK-EG-100890", carrier: "DHL", status: "in_transit", shippedAt: new Date("2024-11-16"), destination: "Alexandria, Egypt", cost: "200.00", description: "Custom guard and grip" },
    ];
    await db.insert(shipments).values(shipmentRows.map((s) => ({ ...s, id: randomUUID() })));
    console.log("shipments: seeded 3 shipments");
  }

  console.log("Seed complete.");
  await pgPoolEnd();
}

async function pgPoolEnd() {
  const { getPool } = await import("../app/lib/db");
  await getPool().end();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
