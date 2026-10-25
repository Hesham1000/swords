import { db, schema } from "../app/lib/db";
import { hashPassword } from "../app/lib/auth/password";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding database...");

  // ---------- Users ----------
  const adminPassword = await hashPassword("Admin@123");
  const managerPassword = await hashPassword("Manager@123");
  const customerPassword = await hashPassword("Customer@123");

  const [admin] = await db
    .insert(schema.users)
    .values({
      username: "admin",
      email: "admin@swords.com",
      password: adminPassword,
      roles: ["admin"],
      isActive: true,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        username: "admin",
        password: adminPassword,
        roles: ["admin"],
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [manager] = await db
    .insert(schema.users)
    .values({
      username: "manager",
      email: "manager@swords.com",
      password: managerPassword,
      roles: ["manager"],
      isActive: true,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        username: "manager",
        password: managerPassword,
        roles: ["manager"],
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  const [customer] = await db
    .insert(schema.users)
    .values({
      username: "customer",
      email: "customer@swords.com",
      password: customerPassword,
      roles: ["user"],
      isActive: true,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        username: "customer",
        password: customerPassword,
        roles: ["user"],
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log("Users seeded:", admin.username, manager.username, customer.username);

  // ---------- Products (12, covering all productType values) ----------
  const productRows = [
    {
      name: "Kings Maraging Lame 105cm",
      description: "High-grade maraging steel sabre lame, size 105cm.",
      price: "4200.00",
      category: ["Sabre"],
      productType: "lame",
      brand: "Kings",
      model: "ML-105",
      quantity: 8,
      isKings: true,
      lameColor: "silver",
      material: "Maraging steel",
    },
    {
      name: "Kings Maraging Lame 110cm",
      description: "High-grade maraging steel sabre lame, size 110cm.",
      price: "4400.00",
      category: ["Sabre"],
      productType: "lame",
      brand: "Kings",
      model: "ML-110",
      quantity: 2,
      isKings: true,
      lameColor: "silver",
      material: "Maraging steel",
    },
    {
      name: "Sabre Wire 1.0mm",
      description: "Insulated sabre body wire, 1.0mm, 2-pin.",
      price: "180.00",
      category: ["Sabre"],
      productType: "wire",
      brand: "Allstar",
      model: "SW-10",
      quantity: 40,
    },
    {
      name: "Foil Wire 2-Pin",
      description: "Foil body wire, 2-pin bayonet connector.",
      price: "160.00",
      category: ["Foil"],
      productType: "wire",
      brand: "Allstar",
      model: "FW-2P",
      quantity: 1,
    },
    {
      name: "PBT Grip Blue",
      description: "Ergonomic pistol grip, blue coating, size small.",
      price: "350.00",
      category: ["Epée", "Foil"],
      productType: "grip",
      brand: "PBT",
      model: "PG-BL",
      quantity: 25,
      hand: "right",
    },
    {
      name: "PBT Grip Red",
      description: "Ergonomic pistol grip, red coating, size large.",
      price: "360.00",
      category: ["Epée"],
      productType: "grip",
      brand: "PBT",
      model: "PG-RD",
      quantity: 2,
      hand: "left",
    },
    {
      name: "ProFencing Sabre Guard",
      description: "Aluminium sabre guard, FIE approved.",
      price: "900.00",
      category: ["Sabre"],
      productType: "guard",
      brand: "ProFencing",
      model: "SG-AL",
      quantity: 15,
    },
    {
      name: "ProFencing Foil Guard",
      description: "Aluminium foil guard, standard size.",
      price: "750.00",
      category: ["Foil"],
      productType: "guard",
      brand: "ProFencing",
      model: "FG-AL",
      quantity: 0,
    },
    {
      name: "Allstar Complete Sabre Weapon",
      description: "Complete sabre weapon with S2000 blade.",
      price: "2600.00",
      category: ["Sabre"],
      productType: "weapon",
      brand: "Allstar",
      model: "AS-SABRE",
      quantity: 10,
    },
    {
      name: "Allstar Complete Epée Weapon",
      description: "Complete epée weapon with maraging blade.",
      price: "2800.00",
      category: ["Epée"],
      productType: "weapon",
      brand: "Allstar",
      model: "AS-EPEE",
      quantity: 2,
    },
    {
      name: "PBT Sabre Mask 350N",
      description: "Sabre fencing mask, 350N CEN level.",
      price: "3100.00",
      category: ["Sabre"],
      productType: "mask",
      brand: "PBT",
      model: "PM-350",
      quantity: 6,
    },
    {
      name: "PBT Fencing Glove Size 8",
      description: "Sabre glove with conductive cuff, size 8.",
      price: "620.00",
      category: ["Sabre"],
      productType: "glove",
      brand: "PBT",
      model: "GL-8",
      quantity: 1,
      gloveSize: "8",
    },
  ];

  for (const row of productRows) {
    await db
      .insert(schema.products)
      .values(row)
      .onConflictDoNothing();
  }

  // Products have no unique key besides id — ensure exactly 12 by name check
  const existingProducts = await db.select().from(schema.products);
  const byName = new Map(existingProducts.map((p) => [p.name, p]));
  for (const row of productRows) {
    if (!byName.has(row.name)) {
      await db.insert(schema.products).values(row);
    }
  }

  const products = await db.select().from(schema.products);
  const productByName = new Map(products.map((p) => [p.name, p]));
  console.log("Products seeded:", products.length);

  // ---------- Invoices (8) ----------
  const invoiceRows = [
    {
      invoiceNumber: "INV-2024-0001",
      customerName: "Ahmed Hassan",
      customerEmail: "ahmed.hassan@example.com",
      customerPhone: "+201001234567",
      status: "paid",
      items: [
        { productId: productByName.get("Kings Maraging Lame 105cm")?.id, name: "Kings Maraging Lame 105cm", quantity: 2, unitPrice: "4200.00" },
        { productId: productByName.get("Sabre Wire 1.0mm")?.id, name: "Sabre Wire 1.0mm", quantity: 3, unitPrice: "180.00" },
      ],
      totalAmount: "8940.00",
      notes: "Club order for national championship prep.",
    },
    {
      invoiceNumber: "INV-2024-0002",
      customerName: "Sara Mahmoud",
      customerEmail: "sara.mahmoud@example.com",
      customerPhone: "+201002345678",
      status: "pending",
      items: [
        { productId: productByName.get("PBT Sabre Mask 350N")?.id, name: "PBT Sabre Mask 350N", quantity: 1, unitPrice: "3100.00" },
      ],
      totalAmount: "3100.00",
    },
    {
      invoiceNumber: "INV-2024-0003",
      customerName: "Omar Khaled",
      customerEmail: "omar.khaled@example.com",
      status: "paid",
      items: [
        { productId: productByName.get("Allstar Complete Sabre Weapon")?.id, name: "Allstar Complete Sabre Weapon", quantity: 1, unitPrice: "2600.00" },
        { productId: productByName.get("PBT Grip Blue")?.id, name: "PBT Grip Blue", quantity: 2, unitPrice: "350.00" },
      ],
      totalAmount: "3300.00",
    },
    {
      invoiceNumber: "INV-2024-0004",
      customerName: "Nour El-Din",
      customerEmail: "nour.eldin@example.com",
      customerPhone: "+201003456789",
      status: "cancelled",
      items: [
        { productId: productByName.get("ProFencing Foil Guard")?.id, name: "ProFencing Foil Guard", quantity: 2, unitPrice: "750.00" },
      ],
      totalAmount: "1500.00",
      notes: "Cancelled by customer.",
    },
    {
      invoiceNumber: "INV-2024-0005",
      customerName: "Laila Adel",
      customerEmail: "laila.adel@example.com",
      status: "paid",
      items: [
        { productId: productByName.get("PBT Fencing Glove Size 8")?.id, name: "PBT Fencing Glove Size 8", quantity: 1, unitPrice: "620.00" },
        { productId: productByName.get("Foil Wire 2-Pin")?.id, name: "Foil Wire 2-Pin", quantity: 2, unitPrice: "160.00" },
      ],
      totalAmount: "940.00",
    },
    {
      invoiceNumber: "INV-2024-0006",
      customerName: "Youssef Tarek",
      customerEmail: "youssef.tarek@example.com",
      customerPhone: "+201004567890",
      status: "pending",
      items: [
        { productId: productByName.get("Allstar Complete Epée Weapon")?.id, name: "Allstar Complete Epée Weapon", quantity: 1, unitPrice: "2800.00" },
        { productId: productByName.get("PBT Grip Red")?.id, name: "PBT Grip Red", quantity: 1, unitPrice: "360.00" },
      ],
      totalAmount: "3160.00",
    },
    {
      invoiceNumber: "INV-2024-0007",
      customerName: "Mariam Samir",
      customerEmail: "mariam.samir@example.com",
      status: "paid",
      items: [
        { productId: productByName.get("ProFencing Sabre Guard")?.id, name: "ProFencing Sabre Guard", quantity: 3, unitPrice: "900.00" },
      ],
      totalAmount: "2700.00",
    },
    {
      invoiceNumber: "INV-2024-0008",
      customerName: "Karim Fathy",
      customerEmail: "karim.fathy@example.com",
      customerPhone: "+201005678901",
      status: "pending",
      items: [
        { productId: productByName.get("Kings Maraging Lame 110cm")?.id, name: "Kings Maraging Lame 110cm", quantity: 1, unitPrice: "4400.00" },
        { productId: productByName.get("Sabre Wire 1.0mm")?.id, name: "Sabre Wire 1.0mm", quantity: 5, unitPrice: "180.00" },
      ],
      totalAmount: "5300.00",
    },
  ];

  for (const row of invoiceRows) {
    await db
      .insert(schema.invoices)
      .values(row)
      .onConflictDoUpdate({
        target: schema.invoices.invoiceNumber,
        set: {
          customerName: row.customerName,
          customerEmail: row.customerEmail,
          customerPhone: row.customerPhone,
          items: row.items,
          totalAmount: row.totalAmount,
          status: row.status,
          notes: row.notes,
          updatedAt: new Date(),
        },
      });
  }

  const invoices = await db.select().from(schema.invoices);
  const invoiceByNumber = new Map(invoices.map((i) => [i.invoiceNumber, i]));
  console.log("Invoices seeded:", invoices.length);

  // ---------- Wallet (admin) ----------
  await db
    .insert(schema.wallet)
    .values({
      userId: admin.id,
      balanceEGP: "50000.00",
      balanceUSD: "500.00",
      balanceEUR: "300.00",
    })
    .onConflictDoUpdate({
      target: schema.wallet.userId,
      set: {
        balanceEGP: "50000.00",
        balanceUSD: "500.00",
        balanceEUR: "300.00",
        updatedAt: new Date(),
      },
    });

  console.log("Wallet seeded for admin");

  // ---------- Wallet transactions (10) ----------
  const txRows = [
    { userId: admin.id, type: "deposit", amount: "20000.00", currency: "EGP", description: "Initial wallet funding" },
    { userId: admin.id, type: "deposit", amount: "30000.00", currency: "EGP", description: "Club sponsorship deposit" },
    { userId: admin.id, type: "withdrawal", amount: "8940.00", currency: "EGP", description: "Payment for INV-2024-0001", referenceId: invoiceByNumber.get("INV-2024-0001")?.id },
    { userId: admin.id, type: "withdrawal", amount: "3100.00", currency: "EGP", description: "Payment for INV-2024-0002", referenceId: invoiceByNumber.get("INV-2024-0002")?.id },
    { userId: admin.id, type: "deposit", amount: "300.00", currency: "USD", description: "USD top-up" },
    { userId: admin.id, type: "withdrawal", amount: "200.00", currency: "USD", description: "Equipment import fee" },
    { userId: admin.id, type: "deposit", amount: "200.00", currency: "USD", description: "Refund from supplier" },
    { userId: admin.id, type: "deposit", amount: "300.00", currency: "EUR", description: "EUR top-up" },
    { userId: admin.id, type: "withdrawal", amount: "150.00", currency: "EUR", description: "FIE license renewal" },
    { userId: admin.id, type: "deposit", amount: "150.00", currency: "EUR", description: "Tournament prize payout" },
  ];

  for (const row of txRows) {
    await db.insert(schema.walletTransactions).values(row);
  }
  console.log("Wallet transactions seeded:", txRows.length);

  // ---------- Shipments (5, linked to invoices) ----------
  const shipmentRows = [
    {
      invoiceId: invoiceByNumber.get("INV-2024-0001")?.id,
      customerName: "Ahmed Hassan",
      address: "12 Nile Street, Zamalek",
      city: "Cairo",
      status: "delivered",
      trackingNumber: "TRK-EG-100001",
    },
    {
      invoiceId: invoiceByNumber.get("INV-2024-0002")?.id,
      customerName: "Sara Mahmoud",
      address: "45 Corniche El Nil, Maadi",
      city: "Cairo",
      status: "in_transit",
      trackingNumber: "TRK-EG-100002",
    },
    {
      invoiceId: invoiceByNumber.get("INV-2024-0003")?.id,
      customerName: "Omar Khaled",
      address: "8 El Geish Road, Smouha",
      city: "Alexandria",
      status: "pending",
      trackingNumber: "TRK-EG-100003",
    },
    {
      invoiceId: invoiceByNumber.get("INV-2024-0005")?.id,
      customerName: "Laila Adel",
      address: "77 Talaat Harb Street, Downtown",
      city: "Cairo",
      status: "delivered",
      trackingNumber: "TRK-EG-100004",
    },
    {
      invoiceId: invoiceByNumber.get("INV-2024-0007")?.id,
      customerName: "Mariam Samir",
      address: "23 Gamal Abdel Nasser Road, Mansoura",
      city: "Mansoura",
      status: "in_transit",
      trackingNumber: "TRK-EG-100005",
    },
  ];

  for (const row of shipmentRows) {
    await db.insert(schema.shipments).values(row);
  }
  console.log("Shipments seeded:", shipmentRows.length);

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
