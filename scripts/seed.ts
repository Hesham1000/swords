import bcrypt from "bcryptjs";
import { db, users, products, invoices, wallet, walletTransactions, shipments, inventoryLogs } from "../app/lib/db";
import { eq } from "drizzle-orm";

async function main() {
  // --- Users (idempotent: check before insert) ---
  const adminPass = bcrypt.hashSync("admin123", 10);
  let [admin] = await db.select().from(users).where(eq(users.username, "admin"));
  if (!admin) {
    [admin] = await db.insert(users).values({
      username: "admin",
      email: "admin@swords.com",
      password: adminPass,
      roles: ["admin"],
    }).returning();
    console.log("Seeded admin user");
  }
  let [user] = await db.select().from(users).where(eq(users.username, "user"));
  if (!user) {
    [user] = await db.insert(users).values({
      username: "user",
      email: "user@swords.com",
      password: adminPass,
      roles: ["user"],
    }).returning();
    console.log("Seeded regular user");
  }

  // --- Products (12, covering all productTypes) ---
  const productSeed = [
    { name: "Allstar FIE Foil Lame", productType: "lame", brand: "Allstar", category: ["Foil"], price: "189.00", quantity: 8, lameColor: "silver", material: "stainless steel" },
    { name: "ProFencing Sabre Body Wire", productType: "body_wire", brand: "ProFencing", category: ["Sabre"], price: "24.50", quantity: 25, material: "copper" },
    { name: "Allstar Electric PBT Jacket", productType: "pbt", brand: "Allstar", category: ["Foil", "Epée"], price: "95.00", quantity: 12 },
    { name: "Kings Absolute Weapon Foil", productType: "weapon", brand: "Kings", category: ["Foil"], price: "72.00", quantity: 2 },
    { name: "ProFencing Visconti Grip", productType: "grip", brand: "ProFencing", category: ["Foil", "Epée"], price: "18.00", quantity: 40 },
    { name: "Allstar Sabre Guard", productType: "guard", brand: "Allstar", category: ["Sabre"], price: "22.00", quantity: 1 },
    { name: "ProFencing Guard Padding", productType: "guard_padding", brand: "ProFencing", category: ["Foil", "Epée", "Sabre"], price: "6.50", quantity: 60 },
    { name: "Kings French Pommel", productType: "french_pommel", brand: "Kings", category: ["Foil", "Epée"], price: "9.00", quantity: 35 },
    { name: "Allstar Blade Nut", productType: "nut", brand: "Allstar", category: ["Foil", "Epée", "Sabre"], price: "3.20", quantity: 100 },
    { name: "ProFencing Foil Point", productType: "point", brand: "ProFencing", category: ["Foil"], price: "15.00", quantity: 2 },
    { name: "Allstar Point Contact Springs", productType: "point_contact_springs", brand: "Allstar", category: ["Foil", "Epée"], price: "4.00", quantity: 80 },
    { name: "Kings Insulating Tube & Socket Set", productType: "socket", brand: "Kings", category: ["Epée"], price: "11.00", quantity: 30, material: "plastic" },
  ];
  for (const p of productSeed) {
    const existing = await db.select().from(products).where(eq(products.name, p.name));
    if (existing.length === 0) {
      await db.insert(products).values({ ...p, images: [] });
    }
  }
  console.log("Seeded products");

  const allProducts = await db.select().from(products);

  // --- Invoices (5) ---
  const invoiceSeed = [
    { invoiceNumber: "INV-001", customerName: "Alice Martin", customerEmail: "alice@example.com", status: "paid", items: [{ productId: allProducts[0]?.id, name: allProducts[0]?.name, quantity: 2, price: "189.00" }], totalAmount: "378.00" },
    { invoiceNumber: "INV-002", customerName: "Bob Chen", customerEmail: "bob@example.com", status: "pending", items: [{ productId: allProducts[3]?.id, name: allProducts[3]?.name, quantity: 1, price: "72.00" }], totalAmount: "72.00" },
    { invoiceNumber: "INV-003", customerName: "Clara Diaz", customerEmail: "clara@example.com", status: "shipped", items: [{ productId: allProducts[4]?.id, name: allProducts[4]?.name, quantity: 5, price: "18.00" }], totalAmount: "90.00" },
    { invoiceNumber: "INV-004", customerName: "David Kim", customerEmail: "david@example.com", status: "pending", items: [{ productId: allProducts[1]?.id, name: allProducts[1]?.name, quantity: 3, price: "24.50" }], totalAmount: "73.50" },
    { invoiceNumber: "INV-005", customerName: "Elena Rossi", customerEmail: "elena@example.com", status: "paid", items: [{ productId: allProducts[2]?.id, name: allProducts[2]?.name, quantity: 1, price: "95.00" }], totalAmount: "95.00" },
  ];
  for (const inv of invoiceSeed) {
    const existing = await db.select().from(invoices).where(eq(invoices.invoiceNumber, inv.invoiceNumber));
    if (existing.length === 0) {
      await db.insert(invoices).values(inv);
    }
  }
  console.log("Seeded invoices");

  const allInvoices = await db.select().from(invoices);

  // --- Wallet for admin ---
  let [adminWallet] = await db.select().from(wallet).where(eq(wallet.userId, admin.id));
  if (!adminWallet) {
    [adminWallet] = await db.insert(wallet).values({ userId: admin.id, balance: "5000.00" }).returning();
    console.log("Seeded wallet");
  }

  // --- Wallet transactions (5) ---
  const txSeed = [
    { type: "deposit", amount: "3000.00", description: "Initial deposit" },
    { type: "deposit", amount: "2500.00", description: "Monthly top-up" },
    { type: "withdrawal", amount: "150.00", description: "Equipment purchase" },
    { type: "withdrawal", amount: "350.00", description: "Tournament fees" },
    { type: "deposit", amount: "500.00", description: "Refund credit" },
  ];
  const existingTx = await db.select().from(walletTransactions).where(eq(walletTransactions.walletId, adminWallet.id));
  if (existingTx.length === 0) {
    await db.insert(walletTransactions).values(txSeed.map((t) => ({ ...t, walletId: adminWallet.id })));
    console.log("Seeded wallet transactions");
  }

  // --- Shipments (3) ---
  const shipmentSeed = [
    { invoice: allInvoices[0], product: allProducts[0], quantity: 2, status: "shipped", trackingNumber: "TRK-100001" },
    { invoice: allInvoices[2], product: allProducts[4], quantity: 5, status: "in_transit", trackingNumber: "TRK-100002" },
    { invoice: allInvoices[4], product: allProducts[2], quantity: 1, status: "pending", trackingNumber: "TRK-100003" },
  ];
  const existingShipments = await db.select().from(shipments);
  if (existingShipments.length === 0) {
    await db.insert(shipments).values(
      shipmentSeed.map((s) => ({
        invoiceId: s.invoice?.id,
        productId: s.product?.id,
        quantity: s.quantity,
        status: s.status,
        trackingNumber: s.trackingNumber,
      }))
    );
    console.log("Seeded shipments");
  }

  // --- Inventory logs (8) ---
  const logSeed = [
    { product: allProducts[0], action: "restock", quantityChange: 10, reason: "New stock arrival" },
    { product: allProducts[1], action: "sale", quantityChange: -3, reason: "Order INV-004" },
    { product: allProducts[2], action: "restock", quantityChange: 5, reason: "Supplier delivery" },
    { product: allProducts[3], action: "sale", quantityChange: -1, reason: "Order INV-002" },
    { product: allProducts[4], action: "adjustment", quantityChange: 2, reason: "Stock count correction" },
    { product: allProducts[5], action: "restock", quantityChange: 20, reason: "Bulk restock" },
    { product: allProducts[6], action: "sale", quantityChange: -4, reason: "Club order" },
    { product: allProducts[7], action: "adjustment", quantityChange: -1, reason: "Damaged item write-off" },
  ];
  const existingLogs = await db.select().from(inventoryLogs);
  if (existingLogs.length === 0) {
    await db.insert(inventoryLogs).values(
      logSeed.map((l) => ({
        productId: l.product?.id!,
        action: l.action,
        quantityChange: l.quantityChange,
        reason: l.reason,
      }))
    );
    console.log("Seeded inventory logs");
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
