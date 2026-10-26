import bcrypt from "bcryptjs";
import { db, users, products, invoices, wallet, walletTransactions, shipments, inventoryLogs } from "../app/lib/db";

async function main() {
  // Idempotency: clear previously seeded rows before inserting.
  await db.delete(inventoryLogs);
  await db.delete(walletTransactions);
  await db.delete(shipments);
  await db.delete(wallet);
  await db.delete(invoices);
  await db.delete(products);
  await db.delete(users);

  const adminHash = await bcrypt.hash("admin123", 12);
  const managerHash = await bcrypt.hash("manager123", 12);
  const userHash = await bcrypt.hash("user123", 12);

  await db.insert(users).values([
    { username: "admin", email: "admin@swords.com", password: adminHash, isActive: true, roles: ["admin"] },
    { username: "manager", email: "manager@swords.com", password: managerHash, isActive: true, roles: ["manager"] },
    { username: "user", email: "user@swords.com", password: userHash, isActive: true, roles: ["user"] },
  ]).onConflictDoNothing();

  const productRows = [
    { name: "Kings Maraging Lame 105cm", description: "Maraging steel sabre lame, size 105cm", price: "4800.00", category: ["Sabre"], productType: "lame", brand: "Kings", model: "ML-105", isKings: true, material: "Maraging steel", quantity: 12 },
    { name: "Alliance Foil Lame 100cm", description: "Foil lame, size 100cm", price: "3900.00", category: ["Foil"], productType: "lame", brand: "Alliance", model: "FL-100", material: "Copper plated steel", quantity: 8 },
    { name: "Sabre Wire 1.0mm", description: "Sabre body wire, 1.0mm", price: "650.00", category: ["Sabre"], productType: "wire", brand: "ProFencing", model: "SW-10", quantity: 40 },
    { name: "Foil Body Wire Clip", description: "Foil body wire with bayonet clip", price: "720.00", category: ["Foil"], productType: "body_wire", brand: "Alliance", model: "FBW-B", quantity: 2 },
    { name: "PBT Grip Blue", description: "PBT pistol grip, blue, small", price: "850.00", category: ["Foil"], productType: "grip", brand: "PBT", model: "PG-B-S", hand: "right", quantity: 25 },
    { name: "ProFencing Visor Guard", description: "Sabre mask replacement visor guard", price: "1200.00", category: ["Sabre"], productType: "guard", brand: "ProFencing", model: "VG-1", quantity: 15 },
    { name: "Mask Guard Padding Set", description: "Replacement mask padding set", price: "450.00", category: ["Foil", "Epée"], productType: "guard_padding", brand: "Alliance", model: "MP-01", quantity: 30 },
    { name: "French Pommel Brass", description: "French grip brass pommel", price: "500.00", category: ["Epée"], productType: "french_pommel", brand: "ProFencing", model: "FP-B", quantity: 1 },
    { name: "Point Assembly Epée", description: "Complete epée point assembly", price: "980.00", category: ["Epée"], productType: "point", brand: "Alliance", model: "PA-E", quantity: 18 },
    { name: "Point Contact Springs (10 pack)", description: "Contact springs for epée point, pack of 10", price: "600.00", category: ["Epée"], productType: "point_contact_springs", brand: "Kings", model: "PCS-10", isKings: true, quantity: 2 },
    { name: "Blade Screws Set (20)", description: "Blade screws, set of 20", price: "300.00", category: ["Foil", "Epée", "Sabre"], productType: "screws", brand: "ProFencing", model: "BS-20", quantity: 50 },
    { name: "Socket Two-Pin", description: "Two-pin body cord socket", price: "550.00", category: ["Foil", "Epée"], productType: "socket", brand: "Alliance", model: "SK-2P", quantity: 22 },
    { name: "Insulating Tube 2m", description: "Insulating heat-shrink tube, 2m", price: "320.00", category: ["Epée"], productType: "insulating_tube", brand: "ProFencing", model: "IT-2", quantity: 35 },
    { name: "Weapon Cable 5m", description: "Weapon cable, 5m spool", price: "780.00", category: ["Epée"], productType: "cable", brand: "Kings", model: "WC-5", isKings: true, quantity: 0 },
    { name: "Bayonet Pin Set", description: "Bayonet pin set for body cords", price: "280.00", category: ["Foil"], productType: "pin", brand: "Alliance", model: "BP-01", quantity: 45 },
    { name: "PBT Complete Weapon Epée", description: "Complete epée weapon with pistol grip", price: "2500.00", category: ["Epée"], productType: "weapon", brand: "PBT", model: "WPN-E", hand: "right", quantity: 6 },
    { name: "PBT Grip Blue Pad", description: "PBT grip replacement pad, blue", price: "380.00", category: ["Foil"], productType: "pbt", brand: "PBT", model: "PBT-PAD", quantity: 28 },
    { name: "PBT Fencing Glove 8", description: "PBT fencing glove, size 8", price: "1100.00", category: ["Foil", "Epée", "Sabre"], productType: "glove", brand: "PBT", model: "GL-8", gloveSize: "8", quantity: 3 },
  ];

  await db.insert(products).values(productRows).onConflictDoNothing();

  const seededProducts = await db.select().from(products);
  const byType = (t: string) => seededProducts.find((p) => p.productType === t)!;
  const lame = byType("lame");
  const grip = byType("grip");
  const glove = byType("glove");
  const wire = byType("wire");
  const point = byType("point");
  const socket = byType("socket");

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  const invoiceRows = [
    { invoiceId: "INV-1001", customer: "Ahmed Hassan", amount: "4800.00", discount: "0", status: "paid", paymentMethod: "cash", date: daysAgo(28), items: [{ productId: lame.id, name: lame.name, quantity: 1, price: 4800 }] },
    { invoiceId: "INV-1002", customer: "Sara Mahmoud", amount: "1950.00", discount: "50", status: "paid", paymentMethod: "card", date: daysAgo(24), items: [{ productId: grip.id, name: grip.name, quantity: 2, price: 850 }, { productId: glove.id, name: glove.name, quantity: 1, price: 1100 }] },
    { invoiceId: "INV-1003", customer: "Omar Khaled", amount: "650.00", discount: "0", status: "pending", paymentMethod: "cash", date: daysAgo(20), items: [{ productId: wire.id, name: wire.name, quantity: 1, price: 650 }] },
    { invoiceId: "INV-1004", customer: "Nour El-Din", amount: "1530.00", discount: "0", status: "overdue", paymentMethod: "transfer", date: daysAgo(18), items: [{ productId: point.id, name: point.name, quantity: 1, price: 980 }, { productId: socket.id, name: socket.name, quantity: 1, price: 550 }] },
    { invoiceId: "INV-1005", customer: "Cairo Fencing Club", amount: "9600.00", discount: "600", status: "paid", paymentMethod: "transfer", date: daysAgo(12), items: [{ productId: lame.id, name: lame.name, quantity: 2, price: 4800 }] },
    { invoiceId: "INV-1006", customer: "Mona Adel", amount: "1100.00", discount: "0", status: "pending", paymentMethod: "card", date: daysAgo(8), items: [{ productId: glove.id, name: glove.name, quantity: 1, price: 1100 }] },
    { invoiceId: "INV-1007", customer: "Youssef Tarek", amount: "1400.00", discount: "0", status: "paid", paymentMethod: "cash", date: daysAgo(4), items: [{ productId: grip.id, name: grip.name, quantity: 1, price: 850 }, { productId: wire.id, name: wire.name, quantity: 1, price: 650 }] },
    { invoiceId: "INV-1008", customer: "Alexandria Academy", amount: "2400.00", discount: "100", status: "overdue", paymentMethod: "transfer", date: daysAgo(1), items: [{ productId: socket.id, name: socket.name, quantity: 2, price: 550 }, { productId: point.id, name: point.name, quantity: 1, price: 980 }, { productId: glove.id, name: glove.name, quantity: 1, price: 1100 }] },
  ];

  await db.insert(invoices).values(invoiceRows).onConflictDoNothing();

  const adminUser = (await db.select().from(users)).find((u) => u.username === "admin")!;

  const [walletRow] = await db.insert(wallet).values({
    userId: adminUser.id,
    balance: "15000.00",
    currency: "EGP",
  }).onConflictDoNothing().returning();

  const walletId = walletRow?.id ?? (await db.select().from(wallet)).find((w) => w.userId === adminUser.id)!.id;

  await db.insert(walletTransactions).values([
    { walletId, type: "deposit", amount: "10000.00", description: "Initial wallet funding", createdAt: new Date(Date.now() - 30 * 86400000) },
    { walletId, type: "deposit", amount: "8000.00", description: "Deposit from INV-1005 payment", createdAt: new Date(Date.now() - 12 * 86400000) },
    { walletId, type: "withdrawal", amount: "1500.00", description: "Supplier payment - ProFencing", createdAt: new Date(Date.now() - 10 * 86400000) },
    { walletId, type: "deposit", amount: "2500.00", description: "Deposit from INV-1001 payment", createdAt: new Date(Date.now() - 28 * 86400000) },
    { walletId, type: "withdrawal", amount: "800.00", description: "Shipping costs", createdAt: new Date(Date.now() - 9 * 86400000) },
    { walletId, type: "deposit", amount: "3000.00", description: "Deposit from INV-1002 payment", createdAt: new Date(Date.now() - 24 * 86400000) },
    { walletId, type: "withdrawal", amount: "2000.00", description: "Equipment restock purchase", createdAt: new Date(Date.now() - 7 * 86400000) },
    { walletId, type: "deposit", amount: "1200.00", description: "Deposit from INV-1007 payment", createdAt: new Date(Date.now() - 4 * 86400000) },
    { walletId, type: "withdrawal", amount: "900.00", description: "Maintenance fees", createdAt: new Date(Date.now() - 3 * 86400000) },
    { walletId, type: "deposit", amount: "500.00", description: "Cash adjustment", createdAt: new Date(Date.now() - 1 * 86400000) },
  ]).onConflictDoNothing();

  await db.insert(shipments).values([
    { invoiceId: "INV-1001", customer: "Ahmed Hassan", address: "12 Nile St, Giza", status: "delivered", items: [{ productId: lame.id, name: lame.name, quantity: 1 }] },
    { invoiceId: "INV-1002", customer: "Sara Mahmoud", address: "45 Tahrir Sq, Cairo", status: "delivered", items: [{ productId: grip.id, name: grip.name, quantity: 2 }, { productId: glove.id, name: glove.name, quantity: 1 }] },
    { invoiceId: "INV-1003", customer: "Omar Khaled", address: "8 Corniche, Alexandria", status: "shipped", items: [{ productId: wire.id, name: wire.name, quantity: 1 }] },
    { invoiceId: "INV-1005", customer: "Cairo Fencing Club", address: "Nasr City, Cairo", status: "shipped", items: [{ productId: lame.id, name: lame.name, quantity: 2 }] },
    { invoiceId: "INV-1008", customer: "Alexandria Academy", address: "Smouha, Alexandria", status: "pending", items: [{ productId: socket.id, name: socket.name, quantity: 2 }, { productId: point.id, name: point.name, quantity: 1 }] },
  ]).onConflictDoNothing();

  await db.insert(inventoryLogs).values([
    { productId: lame.id, changeType: "restock", quantityChange: 10, reason: "New shipment from Kings", createdAt: new Date(Date.now() - 29 * 86400000) },
    { productId: lame.id, changeType: "sale", quantityChange: -2, reason: "INV-1005", createdAt: new Date(Date.now() - 12 * 86400000) },
    { productId: grip.id, changeType: "restock", quantityChange: 20, reason: "Monthly restock", createdAt: new Date(Date.now() - 27 * 86400000) },
    { productId: grip.id, changeType: "sale", quantityChange: -2, reason: "INV-1002", createdAt: new Date(Date.now() - 24 * 86400000) },
    { productId: wire.id, changeType: "restock", quantityChange: 30, reason: "Bulk wire order", createdAt: new Date(Date.now() - 25 * 86400000) },
    { productId: wire.id, changeType: "sale", quantityChange: -1, reason: "INV-1003", createdAt: new Date(Date.now() - 20 * 86400000) },
    { productId: glove.id, changeType: "sale", quantityChange: -1, reason: "INV-1002", createdAt: new Date(Date.now() - 24 * 86400000) },
    { productId: glove.id, changeType: "adjustment", quantityChange: -1, reason: "Damaged in storage", createdAt: new Date(Date.now() - 15 * 86400000) },
    { productId: point.id, changeType: "restock", quantityChange: 15, reason: "Point assembly restock", createdAt: new Date(Date.now() - 22 * 86400000) },
    { productId: point.id, changeType: "sale", quantityChange: -1, reason: "INV-1004", createdAt: new Date(Date.now() - 18 * 86400000) },
    { productId: socket.id, changeType: "restock", quantityChange: 25, reason: "Socket restock", createdAt: new Date(Date.now() - 21 * 86400000) },
    { productId: socket.id, changeType: "sale", quantityChange: -2, reason: "INV-1008", createdAt: new Date(Date.now() - 1 * 86400000) },
    { productId: wire.id, changeType: "adjustment", quantityChange: 2, reason: "Found uncounted stock", createdAt: new Date(Date.now() - 14 * 86400000) },
    { productId: grip.id, changeType: "sale", quantityChange: -1, reason: "INV-1007", createdAt: new Date(Date.now() - 4 * 86400000) },
    { productId: lame.id, changeType: "adjustment", quantityChange: 1, reason: "Return from customer", createdAt: new Date(Date.now() - 6 * 86400000) },
  ]).onConflictDoNothing();

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
