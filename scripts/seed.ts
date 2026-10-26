import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, users, products, invoices, wallet, walletTransactions, shipments } from "../app/lib/db";

async function main() {
  // 1. Admin user (upsert on email)
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await db
    .insert(users)
    .values({
      username: "admin",
      email: "[REDACTED_EMAIL]",
      password: hashedPassword,
      roles: ["admin"],
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { username: "admin", password: hashedPassword, roles: ["admin"], isActive: true, updatedAt: new Date() },
    });

  const admin = (await db.select().from(users).limit(1))[0];

  // 2. Products (upsert on name)
  const productData = [
    { name: "Kings Foil Blade", description: "Maraging steel foil blade, electric", price: "1850.00", category: ["Foil"], productType: "lame", brand: "Kings", model: "KF-100", quantity: 25, isKings: true, material: "Maraging steel" },
    { name: "Alliance Foil Blade", description: "Standard foil blade", price: "1200.00", category: ["Foil"], productType: "lame", brand: "Alliance", model: "AF-200", quantity: 18, material: "Steel" },
    { name: "ProTouch Sabre Blade", description: "Sabre blade, non-electric", price: "950.00", category: ["Sabre"], productType: "lame", brand: "ProTouch", model: "SB-300", quantity: 2, material: "Steel" },
    { name: "CSA Epee Blade", description: "Epee blade, electric", price: "2100.00", category: ["Epée"], productType: "lame", brand: "CSA", model: "EB-400", quantity: 12, material: "Maraging steel" },
    { name: "Kings Foil Grip", description: "Visconti foil grip", price: "320.00", category: ["Foil"], productType: "grip", brand: "Kings", model: "FG-10", quantity: 40, isKings: true },
    { name: "Alliance Epee Grip", description: "Pistol grip for epee", price: "280.00", category: ["Epée"], productType: "grip", brand: "Alliance", model: "EG-20", quantity: 35 },
    { name: "ProTouch Foil Guard", description: "Foil bell guard, standard", price: "180.00", category: ["Foil"], productType: "guard", brand: "ProTouch", model: "FGD-5", quantity: 50 },
    { name: "CSA Sabre Guard", description: "Sabre guard", price: "220.00", category: ["Sabre"], productType: "guard", brand: "CSA", model: "SGD-6", quantity: 1 },
    { name: "Kings Fencing Glove", description: "Padded fencing glove, 800N", price: "450.00", category: ["Foil", "Sabre", "Epée"], productType: "glove", brand: "Kings", model: "GLV-8", quantity: 30, isKings: true, gloveSize: "M" },
    { name: "Alliance Foil Point", description: "Foil point assembly", price: "150.00", category: ["Foil"], productType: "point", brand: "Alliance", model: "FP-3", quantity: 45 },
    { name: "ProTouch Epee Point", description: "Epee point assembly", price: "190.00", category: ["Epée"], productType: "point", brand: "ProTouch", model: "EP-4", quantity: 2 },
    { name: "CSA Body Wire", description: "Fencing body wire, 2-pin", price: "260.00", category: ["Foil", "Epée"], productType: "wire", brand: "CSA", model: "BW-2", quantity: 38 },
  ];

  for (const p of productData) {
    const existing = await db.select().from(products).where(eq(products.name, p.name)).limit(1);
    if (existing.length > 0) {
      await db.update(products).set({ ...p, images: [], updatedAt: new Date() }).where(eq(products.name, p.name));
    } else {
      await db.insert(products).values({ ...p, images: [] }).onConflictDoNothing();
    }
  }

  // 3. Wallet for admin
  await db
    .insert(wallet)
    .values({ userId: admin.id, balanceEGP: "50000.00", balanceUSD: "1000.00", balanceEUR: "800.00" })
    .onConflictDoUpdate({
      target: wallet.userId,
      set: { balanceEGP: "50000.00", balanceUSD: "1000.00", balanceEUR: "800.00", updatedAt: new Date() },
    });
  const adminWallet = (await db.select().from(wallet).limit(1))[0];

  // 4. Wallet transactions
  const txData = [
    { type: "deposit", amount: "20000.00", currency: "EGP", description: "Initial deposit" },
    { type: "deposit", amount: "500.00", currency: "USD", description: "USD top-up" },
    { type: "withdraw", amount: "3500.00", currency: "EGP", description: "Equipment purchase" },
    { type: "deposit", amount: "15000.00", currency: "EGP", description: "Invoice payment received" },
    { type: "withdraw", amount: "200.00", currency: "USD", description: "Import fees" },
    { type: "deposit", amount: "300.00", currency: "EUR", description: "EUR transfer" },
    { type: "withdraw", amount: "8000.00", currency: "EGP", description: "Supplier payment" },
    { type: "deposit", amount: "5000.00", currency: "EGP", description: "Cash deposit" },
  ];
  // No unique constraint on wallet_transactions: clear and re-insert for idempotency
  await db.delete(walletTransactions).where(eq(walletTransactions.walletId, adminWallet.id));
  await db.insert(walletTransactions).values(
    txData.map((t) => ({ walletId: adminWallet.id, ...t, referenceId: null }))
  );

  // 5. Invoices
  const allProducts = await db.select().from(products);
  const statuses = ["paid", "pending", "cancelled", "paid", "paid", "pending", "paid", "cancelled", "pending", "paid"];
  const customers = [
    ["Ahmed Hassan", "ahmed@example.com", "01001234567"],
    ["Sara Mahmoud", "sara@example.com", "01112345678"],
    ["Omar Khaled", "omar@example.com", "01223456789"],
    ["Nour Ali", "nour@example.com", "01034567890"],
    ["Youssef Adel", "youssef@example.com", "01145678901"],
    ["Mona Samir", "mona@example.com", "01256789012"],
    ["Karim Tarek", "karim@example.com", "01067890123"],
    ["Hana Mostafa", "hana@example.com", "01178901234"],
    ["Tamer Fathy", "tamer@example.com", "01289012345"],
    ["Laila Nabil", "laila@example.com", "01090123456"],
  ];

  const invoiceIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const picked = [allProducts[i % allProducts.length], allProducts[(i + 3) % allProducts.length]];
    const items = picked.map((p, j) => ({
      productId: p.id,
      name: p.name,
      quantity: j + 1,
      price: parseFloat(p.price || "0"),
    }));
    const totalAmount = items.reduce((s, it) => s + it.quantity * it.price, 0);
    const [inv] = await db
      .insert(invoices)
      .values({
        invoiceNumber: `INV-2024-${String(i + 1).padStart(3, "0")}`,
        customerName: customers[i][0],
        customerEmail: customers[i][1],
        customerPhone: customers[i][2],
        items,
        totalAmount: totalAmount.toFixed(2),
        status: statuses[i],
        paymentMethod: i % 2 === 0 ? "cash" : "card",
        date: `2024-0${(i % 9) + 1}-1${i}`,
      })
      .onConflictDoUpdate({
        target: invoices.invoiceNumber,
        set: { items, totalAmount: totalAmount.toFixed(2), status: statuses[i], updatedAt: new Date() },
      })
      .returning();
    invoiceIds.push(inv.id);
  }

  // 6. Shipments linked to first 5 invoices
  const shipmentData = [
    { invoiceIdx: 0, city: "Cairo", destination: "Nasr City", cost: "150.00", status: "delivered" },
    { invoiceIdx: 1, city: "Giza", destination: "Dokki", cost: "120.00", status: "shipped" },
    { invoiceIdx: 2, city: "Alexandria", destination: "Smouha", cost: "200.00", status: "pending" },
    { invoiceIdx: 3, city: "Cairo", destination: "Maadi", cost: "140.00", status: "delivered" },
    { invoiceIdx: 4, city: "Mansoura", destination: "City Center", cost: "250.00", status: "shipped" },
  ];
  // No unique constraint on shipments: clear seeded ones and re-insert for idempotency
  await db.delete(shipments);
  await db.insert(shipments).values(
    shipmentData.map((s) => {
      const inv = invoiceIds[s.invoiceIdx];
      return {
        invoiceId: inv,
        customerName: customers[s.invoiceIdx][0],
        address: `${s.destination}, ${s.city}`,
        city: s.city,
        destination: s.destination,
        cost: s.cost,
        description: `Shipment for INV-2024-${String(s.invoiceIdx + 1).padStart(3, "0")}`,
        date: `2024-0${(s.invoiceIdx % 9) + 1}-1${s.invoiceIdx}`,
        status: s.status,
        trackingNumber: `TRK-2024-${String(s.invoiceIdx + 1).padStart(3, "0")}`,
      };
    })
  );

  // 7. Summary
  const count = async (t: any) => (await db.select().from(t)).length;
  console.log("Seed complete:");
  console.log("  users:", await count(users));
  console.log("  products:", await count(products));
  console.log("  wallet:", await count(wallet));
  console.log("  wallet_transactions:", await count(walletTransactions));
  console.log("  invoices:", await count(invoices));
  console.log("  shipments:", await count(shipments));
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
