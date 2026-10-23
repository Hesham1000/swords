import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../app/lib/db";
import { users, products, invoices, wallet, walletTransactions } from "../app/lib/db/schema";

async function main() {
  console.log("Seeding database...");

  // 1. Default admin user
  const hashedPassword = await bcrypt.hash("hashed_password", 10);
  const [admin] = await db
    .insert(users)
    .values({
      username: "admin",
      email: "[REDACTED_EMAIL]",
      password: hashedPassword,
      isActive: true,
      roles: ["admin"],
    })
    .onConflictDoNothing()
    .returning();
  const adminUser =
    admin ??
    (await db.select().from(users).where(eq(users.username, "admin")))[0];
  console.log("Admin user:", adminUser?.id);

  // 2. Sample products
  const productRows = [
    {
      name: "Absolute Foil Electric Blade",
      description: "Complete electric foil weapon with french grip.",
      price: "85.00",
      category: ["Foil"],
      productType: "weapon",
      brand: "Absolute",
      model: "Foil Complete",
      quantity: 25,
      images: ["https://placehold.co/600x400?text=Foil+Blade"],
    },
    {
      name: "Uhlmann Sabre Electric Blade",
      description: "S2000 sabre blade with sabel grip.",
      price: "95.00",
      category: ["Sabre"],
      productType: "weapon",
      brand: "Uhlmann",
      model: "Sabre Complete",
      quantity: 18,
      images: ["https://placehold.co/600x400?text=Sabre+Blade"],
    },
    {
      name: "Leon Paul Epée Blade",
      description: "Maraging steel epée blade, competition grade.",
      price: "120.00",
      category: ["Epée"],
      productType: "weapon",
      brand: "Leon Paul",
      model: "Epée Complete",
      quantity: 12,
      images: ["https://placehold.co/600x400?text=Epee+Blade"],
    },
    {
      name: "Fencing Glove - Foil",
      description: "Padded fencing glove, right hand, size M.",
      price: "35.00",
      category: ["Foil"],
      productType: "gear",
      brand: "PBT",
      model: "Glove Pro",
      gloveSize: "M",
      hand: "right",
      quantity: 40,
      images: ["https://placehold.co/600x400?text=Fencing+Glove"],
    },
    {
      name: "Sabre Mask 350N",
      description: "CE 350N sabre fencing mask with bib.",
      price: "150.00",
      category: ["Sabre"],
      productType: "gear",
      brand: "Allstar",
      model: "Mask 350N",
      quantity: 8,
      images: ["https://placehold.co/600x400?text=Sabre+Mask"],
    },
  ];

  const insertedProducts = await db
    .insert(products)
    .values(productRows)
    .returning();
  console.log(`Inserted ${insertedProducts.length} products`);

  // 3. Sample invoices linked to products
  const invoiceRows = insertedProducts.slice(0, 3).map((p, i) => ({
    invoiceNumber: `INV-2026-000${i + 1}`,
    customerName: ["Ahmed Hassan", "Sara Mahmoud", "Omar Khaled"][i],
    customerEmail: ["ahmed@example.com", "sara@example.com", "omar@example.com"][i],
    items: [
      {
        productId: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: 1,
      },
    ],
    total: p.price,
    status: ["paid", "pending", "paid"][i],
    paymentMethod: ["cash", "card", "wallet"][i],
    invoiceDate: new Date().toISOString().slice(0, 10),
  }));

  const insertedInvoices = await db.insert(invoices).values(invoiceRows).returning();
  console.log(`Inserted ${insertedInvoices.length} invoices`);

  // 4. Wallet for admin + 2 transactions
  const [adminWallet] = await db
    .insert(wallet)
    .values({
      userId: adminUser.id,
      balance: "500.00",
      balanceEGP: "500.00",
      balanceUSD: "10.00",
      balanceEUR: "9.00",
      initialized: true,
    })
    .returning();
  console.log("Wallet created:", adminWallet.id);

  await db.insert(walletTransactions).values([
    {
      walletId: adminWallet.id,
      type: "deposit",
      amount: "600.00",
      description: "Initial deposit",
      currency: "EGP",
    },
    {
      walletId: adminWallet.id,
      type: "withdrawal",
      amount: "100.00",
      description: "Equipment purchase",
      currency: "EGP",
      referenceId: insertedInvoices[0].id,
    },
  ]);
  console.log("Inserted 2 wallet transactions");

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
