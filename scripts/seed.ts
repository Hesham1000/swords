import bcrypt from "bcryptjs";
import { db, users, products, invoices, wallet, walletTransactions, shipments, inventoryLogs } from "../app/lib/db";

async function main() {
  console.log("Seeding database...");

  // (a) Admin user
  const [admin] = await db
    .insert(users)
    .values({
      username: "admin",
      email: "admin@example.com",
      password: bcrypt.hashSync("admin123", 10),
      roles: ["admin"],
      isActive: true,
      firstName: "Admin",
      dateJoined: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  const adminId =
    admin?.id ??
    (await db.select().from(users)).find((u) => u.username === "admin")!.id;
  console.log("Admin user ready:", adminId);

  // (b) 12 products covering all productType values
  const productRows = [
    // 3 lames
    { name: "Kings Maraging Lame - Silver", description: "High-grade maraging steel foil lame in silver, FIE quality.", price: "189.99", category: ["Foil"], productType: "lame", brand: "Kings", model: "KM-SLV-01", quantity: 12, lameColor: "Silver", material: "Maraging Steel", images: [] },
    { name: "Sabre Lame - Blue", description: "Electrically conductive sabre lame with blue anodized finish.", price: "145.00", category: ["Sabre"], productType: "lame", brand: "ProFencing", model: "SL-BLU-02", quantity: 2, lameColor: "Blue", material: "Stainless Steel", images: [] },
    { name: "Epée Lame - Rainbow", description: "Epée lame with iridescent rainbow coating, competition ready.", price: "210.50", category: ["Epée"], productType: "lame", brand: "Elite", model: "EL-RBW-03", quantity: 1, lameColor: "Rainbow", material: "Maraging Steel", images: [] },
    // 2 wires
    { name: "Epée Pressure Spring Wire", description: "Replacement pressure spring wire for epée points.", price: "15.00", category: ["Epée"], productType: "wire", brand: "ProFencing", model: "PW-EP-01", quantity: 40, images: [] },
    { name: "Foil Contact Wire", description: "Insulated contact wire for foil body cords.", price: "18.50", category: ["Foil"], productType: "wire", brand: "Elite", model: "EW-FO-02", quantity: 35, images: [] },
    // 2 PBTs
    { name: "PBT Foil Mask Cord", description: "PBT standard mask cord for foil electric scoring.", price: "32.00", category: ["Foil"], productType: "pbt", brand: "ProFencing", model: "PBT-FO-01", quantity: 25, images: [] },
    { name: "PBT Sabre Body Cord", description: "Durable PBT sabre body cord with 2-pin connector.", price: "38.00", category: ["Sabre"], productType: "pbt", brand: "Elite", model: "PBT-SA-02", quantity: 2, images: [] },
    // 1 weapon
    { name: "Kings Complete Epée Weapon", description: "Complete electric epée with French grip, ready to fence.", price: "250.00", category: ["Epée"], productType: "weapon", brand: "Kings", model: "KW-EP-01", quantity: 8, images: [] },
    // 1 grip
    { name: "Visconti Pistol Grip", description: "Ergonomic aluminum Visconti pistol grip, size 2.", price: "45.00", category: ["Foil"], productType: "grip", brand: "ProFencing", model: "GR-VIS-02", quantity: 20, images: [] },
    // 1 guard
    { name: "Epée Steel Guard", description: "Standard steel bell guard for epée, FIE approved.", price: "55.00", category: ["Epée"], productType: "guard", brand: "Elite", model: "GD-EP-01", quantity: 15, images: [] },
    // 1 guard_padding
    { name: "Guard Padding Insert", description: "Replacement foam padding insert for weapon guards.", price: "16.00", category: ["Foil"], productType: "guard_padding", brand: "Kings", model: "GP-STD-01", quantity: 30, images: [] },
    // 1 french_pommel
    { name: "French Pommel Nut", description: "Brass French pommel for securing grips.", price: "22.00", category: ["Foil"], productType: "french_pommel", brand: "ProFencing", model: "FP-FR-01", quantity: 28, images: [] },
    // 1 nut
    { name: "Barrel Nut Set", description: "Set of 5 barrel nuts for point assembly.", price: "19.00", category: ["Epée"], productType: "nut", brand: "Elite", model: "NT-BRL-01", quantity: 50, images: [] },
    // 1 point
    { name: "Epée Point Assembly", description: "Complete epée point assembly with screws and springs.", price: "48.00", category: ["Epée"], productType: "point", brand: "Kings", model: "PT-EP-01", quantity: 18, images: [] },
    // 1 socket
    { name: "Two-Pin Bayonet Socket", description: "Two-pin bayonet weapon socket for body cords.", price: "24.00", category: ["Sabre"], productType: "socket", brand: "ProFencing", model: "SK-2P-01", quantity: 22, images: [] },
  ];

  await db.insert(products).values(productRows).onConflictDoNothing();
  console.log("Products seeded:", productRows.length);

  // (c) 3 invoices linked to admin
  await db
    .insert(invoices)
    .values([
      { userId: adminId, invoiceId: "INV-2024-001", customer: "Ahmed Hassan", items: [{ name: "Kings Maraging Lame - Silver", quantity: 1, price: 189.99 }, { name: "Foil Contact Wire", quantity: 2, price: 18.5 }], total: "226.99", amount: "226.99", discount: "0", paymentMethod: "card", date: "2024-06-01", status: "paid" },
      { userId: adminId, invoiceId: "INV-2024-002", customer: "Sara Mahmoud", items: [{ name: "Visconti Pistol Grip", quantity: 1, price: 45 }], total: "45.00", amount: "45.00", discount: "5", paymentMethod: "cash", date: "2024-06-05", status: "pending" },
      { userId: adminId, invoiceId: "INV-2024-003", customer: "Omar Khaled", items: [{ name: "Kings Complete Epée Weapon", quantity: 1, price: 250 }], total: "250.00", amount: "250.00", discount: "0", paymentMethod: "wallet", date: "2024-06-10", status: "paid" },
    ])
    .onConflictDoNothing();
  console.log("Invoices seeded: 3");

  // (d) Wallet for admin
  await db
    .insert(wallet)
    .values({ userId: adminId, balance: "500", balanceEGP: "500", balanceUSD: "500", balanceEUR: "500", initialized: true })
    .onConflictDoNothing();
  console.log("Wallet seeded: 1");

  // (e) 5 wallet transactions (no natural unique key — guard by count for idempotency)
  const txCount = await db.$count(walletTransactions);
  if (txCount === 0) {
  await db
    .insert(walletTransactions)
    .values([
      { userId: adminId, amount: "300", type: "deposit", description: "Initial wallet deposit", currency: "USD", date: new Date("2024-06-01") },
      { userId: adminId, amount: "200", type: "deposit", description: "Second deposit", currency: "USD", date: new Date("2024-06-03") },
      { userId: adminId, amount: "250", type: "purchase", description: "Purchase: Kings Complete Epée Weapon", currency: "USD", referenceId: "INV-2024-003", date: new Date("2024-06-10") },
      { userId: adminId, amount: "45", type: "purchase", description: "Purchase: Visconti Pistol Grip", currency: "USD", referenceId: "INV-2024-002", date: new Date("2024-06-05") },
      { userId: adminId, amount: "150", type: "deposit", description: "Refund deposit", currency: "USD", date: new Date("2024-06-12") },
    ])
    .onConflictDoNothing();
  console.log("Wallet transactions seeded: 5");
  } else {
    console.log("Wallet transactions already seeded, skipping");
  }

  // (f) 3 shipments (no natural unique key — guard by count for idempotency)
  const shipmentCount = await db.$count(shipments);
  if (shipmentCount === 0) {
  const allProducts = await db.select().from(products);
  const pick = (name: string) => allProducts.find((p) => p.name === name)!;
  await db
    .insert(shipments)
    .values([
      { userId: adminId, productId: pick("Kings Maraging Lame - Silver").id, quantity: 5, status: "shipped", destination: "Cairo Fencing Club, Cairo", cost: "35.00", description: "Restock lames", date: "2024-06-02" },
      { userId: adminId, productId: pick("Epée Point Assembly").id, quantity: 10, status: "pending", destination: "Alexandria Academy, Alexandria", cost: "20.00", description: "Point assemblies order", date: "2024-06-07" },
      { userId: adminId, productId: pick("PBT Sabre Body Cord").id, quantity: 8, status: "delivered", destination: "Giza Sports Center, Giza", cost: "28.00", description: "Body cords delivery", date: "2024-06-11" },
    ])
    .onConflictDoNothing();
  console.log("Shipments seeded: 3");
  } else {
    console.log("Shipments already seeded, skipping");
  }

  // (g) 5 inventory logs (no natural unique key — guard by count for idempotency)
  const logCount = await db.$count(inventoryLogs);
  if (logCount === 0) {
  const allProducts2 = await db.select().from(products);
  const pick2 = (name: string) => allProducts2.find((p) => p.name === name)!;
  await db
    .insert(inventoryLogs)
    .values([
      { productId: pick2("Kings Maraging Lame - Silver").id, userId: adminId, action: "restock", quantityChange: 12, productName: "Kings Maraging Lame - Silver", reason: "New shipment received", operator: "admin", timestamp: new Date("2024-06-02") },
      { productId: pick2("Sabre Lame - Blue").id, userId: adminId, action: "sale", quantityChange: -3, productName: "Sabre Lame - Blue", reason: "Customer order", operator: "admin", timestamp: new Date("2024-06-04") },
      { productId: pick2("Epée Lame - Rainbow").id, userId: adminId, action: "price_update", quantityChange: 0, productName: "Epée Lame - Rainbow", oldPrice: "220.00", newPrice: "210.50", reason: "Price adjustment", operator: "admin", timestamp: new Date("2024-06-06") },
      { productId: pick2("PBT Sabre Body Cord").id, userId: adminId, action: "restock", quantityChange: 2, productName: "PBT Sabre Body Cord", reason: "Partial restock", operator: "admin", timestamp: new Date("2024-06-08") },
      { productId: pick2("Kings Complete Epée Weapon").id, userId: adminId, action: "sale", quantityChange: -1, productName: "Kings Complete Epée Weapon", reason: "Invoice INV-2024-003", referenceId: "INV-2024-003", operator: "admin", timestamp: new Date("2024-06-10") },
    ])
    .onConflictDoNothing();
  console.log("Inventory logs seeded: 5");
  } else {
    console.log("Inventory logs already seeded, skipping");
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
