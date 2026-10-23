import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../app/lib/db";
import { users, products, invoices, wallet } from "../app/lib/schema";

export async function seed() {
  // --- Users ---
  const existingUsers = await db.select().from(users);
  let adminId: string | undefined = existingUsers[0]?.id;

  if (existingUsers.length === 0) {
    const insertedUsers = await db
      .insert(users)
      .values({
        username: "admin",
        email: "admin@swords.com",
        password: bcrypt.hashSync("admin123", 10),
        isActive: true,
        roles: ["admin"],
      })
      .returning();
    adminId = insertedUsers[0].id;
    console.log(`Inserted ${insertedUsers.length} user(s)`);
  } else {
    console.log("Users table not empty, skipping user seed");
  }

  // --- Products ---
  const existingProducts = await db.select().from(products);
  let insertedProducts: (typeof products.$inferSelect)[] = [];

  if (existingProducts.length === 0) {
    insertedProducts = await db
      .insert(products)
      .values([
        {
          name: "Sabre Lame",
          description: "Electrically conductive sabre jacket for competition scoring.",
          price: "2450.00",
          category: ["Weapons"],
          productType: "Lame",
          brand: "Absolute",
          model: "SL-350N",
          material: "Nylon with copper coating",
          quantity: 8,
        },
        {
          name: "Epée Wire",
          description: "Replacement internal wiring for épée blades.",
          price: "180.00",
          category: ["Weapons", "Accessories"],
          productType: "Wire",
          brand: "Uhlmann",
          model: "EW-2P",
          quantity: 2,
        },
        {
          name: "Foil PBT",
          description: "Complete PBT foil with pistol grip and French blade option.",
          price: "980.00",
          category: ["Weapons"],
          productType: "Foil",
          brand: "PBT",
          model: "F-01",
          quantity: 12,
        },
        {
          name: "Fencing Mask 350N",
          description: "CE 350N certified fencing mask with removable bib.",
          price: "1650.00",
          category: ["Protective Gear"],
          productType: "Mask",
          brand: "Leon Paul",
          model: "X-Change",
          quantity: 6,
        },
        {
          name: "Sabre Mask 1600N",
          description: "FIE 1600N sabre mask with conductive bib.",
          price: "3200.00",
          category: ["Protective Gear"],
          productType: "Mask",
          brand: "Allstar",
          model: "FIE Sabre",
          quantity: 1,
        },
        {
          name: "Fencing Glove",
          description: "Padded fencing glove with cuff, suitable for all weapons.",
          price: "420.00",
          category: ["Protective Gear"],
          productType: "Glove",
          brand: "PBT",
          model: "G-Standard",
          gloveSize: "M",
          quantity: 15,
        },
        {
          name: "Fencing Jacket 350N",
          description: "Lightweight 350N washable fencing jacket.",
          price: "1850.00",
          category: ["Protective Gear"],
          productType: "Jacket",
          brand: "Absolute",
          model: "Fusion",
          quantity: 7,
        },
        {
          name: "Body Cord 2-Pin",
          description: "Two-pin body cord for foil and épée.",
          price: "260.00",
          category: ["Accessories"],
          productType: "Body Cord",
          brand: "Uhlmann",
          model: "BC-2P",
          quantity: 2,
        },
        {
          name: "Body Cord 3-Pin",
          description: "Three-pin body cord for épée.",
          price: "280.00",
          category: ["Accessories"],
          productType: "Body Cord",
          brand: "Absolute",
          model: "BC-3P",
          quantity: 20,
        },
        {
          name: "Scoring Machine",
          description: "Portable 3-weapon scoring machine with rechargeable battery.",
          price: "12500.00",
          category: ["Accessories", "Equipment"],
          productType: "Scoring Machine",
          brand: "Negrini",
          model: "SM-3W",
          quantity: 1,
        },
        {
          name: "Fencing Plastron",
          description: "Underarm protective plastron, 350N certified.",
          price: "560.00",
          category: ["Protective Gear"],
          productType: "Plastron",
          brand: "PBT",
          model: "P-350",
          quantity: 10,
        },
        {
          name: "Sabre Blade S2000",
          description: "FIE S2000 maraging steel sabre blade.",
          price: "1350.00",
          category: ["Weapons"],
          productType: "Blade",
          brand: "Allstar",
          model: "S2000",
          quantity: 2,
        },
      ])
      .returning();
    console.log(`Inserted ${insertedProducts.length} product(s)`);
  } else {
    console.log("Products table not empty, skipping product seed");
  }

  // --- Invoices ---
  const existingInvoices = await db.select().from(invoices);

  if (existingInvoices.length === 0) {
    const p = (name: string) => insertedProducts.find((prod) => prod.name === name);

    const invoiceSeeds = [
      {
        invoiceId: "INV-2024-0001",
        customer: "Ahmed Hassan",
        items: [
          { productId: p("Foil PBT")?.id, name: "Foil PBT", quantity: 2, unitPrice: "980.00" },
          { productId: p("Fencing Glove")?.id, name: "Fencing Glove", quantity: 2, unitPrice: "420.00" },
        ],
        amount: "2800.00",
        discount: "100.00",
        status: "paid",
        paymentMethod: "cash",
        date: "2024-03-12",
      },
      {
        invoiceId: "INV-2024-0002",
        customer: "Sara Mahmoud",
        items: [
          { productId: p("Fencing Mask 350N")?.id, name: "Fencing Mask 350N", quantity: 1, unitPrice: "1650.00" },
          { productId: p("Fencing Jacket 350N")?.id, name: "Fencing Jacket 350N", quantity: 1, unitPrice: "1850.00" },
        ],
        amount: "3500.00",
        discount: "0.00",
        status: "paid",
        paymentMethod: "card",
        date: "2024-04-02",
      },
      {
        invoiceId: "INV-2024-0003",
        customer: "Omar Khaled",
        items: [
          { productId: p("Body Cord 2-Pin")?.id, name: "Body Cord 2-Pin", quantity: 3, unitPrice: "260.00" },
          { productId: p("Epée Wire")?.id, name: "Epée Wire", quantity: 2, unitPrice: "180.00" },
        ],
        amount: "1140.00",
        discount: "40.00",
        status: "pending",
        paymentMethod: "wallet",
        date: "2024-05-18",
      },
      {
        invoiceId: "INV-2024-0004",
        customer: "Nour El-Din",
        items: [
          { productId: p("Sabre Lame")?.id, name: "Sabre Lame", quantity: 1, unitPrice: "2450.00" },
          { productId: p("Sabre Blade S2000")?.id, name: "Sabre Blade S2000", quantity: 1, unitPrice: "1350.00" },
        ],
        amount: "3800.00",
        discount: "200.00",
        status: "overdue",
        paymentMethod: "installments",
        date: "2024-06-25",
      },
      {
        invoiceId: "INV-2024-0005",
        customer: "Laila Adel",
        items: [
          { productId: p("Fencing Plastron")?.id, name: "Fencing Plastron", quantity: 2, unitPrice: "560.00" },
          { productId: p("Fencing Glove")?.id, name: "Fencing Glove", quantity: 1, unitPrice: "420.00" },
        ],
        amount: "1540.00",
        discount: "0.00",
        status: "paid",
        paymentMethod: "cash",
        date: "2024-07-09",
      },
      {
        invoiceId: "INV-2024-0006",
        customer: "Cairo Fencing Club",
        items: [
          { productId: p("Scoring Machine")?.id, name: "Scoring Machine", quantity: 1, unitPrice: "12500.00" },
          { productId: p("Body Cord 3-Pin")?.id, name: "Body Cord 3-Pin", quantity: 6, unitPrice: "280.00" },
        ],
        amount: "14180.00",
        discount: "500.00",
        status: "pending",
        paymentMethod: "bank_transfer",
        date: "2024-08-14",
      },
    ];

    const insertedInvoices = await db.insert(invoices).values(invoiceSeeds).returning();
    console.log(`Inserted ${insertedInvoices.length} invoice(s)`);
  } else {
    console.log("Invoices table not empty, skipping invoice seed");
  }

  // --- Wallet ---
  const existingWallets = await db.select().from(wallet);

  if (existingWallets.length === 0 && adminId) {
    const insertedWallets = await db
      .insert(wallet)
      .values({
        userId: adminId,
        balance: "10000",
        currency: "EGP",
      })
      .returning();
    console.log(`Inserted ${insertedWallets.length} wallet row(s)`);
  } else {
    console.log("Wallet table not empty (or no admin user), skipping wallet seed");
  }
}

async function main() {
  try {
    await seed();
    console.log("Seed completed successfully");
    await db.$client.end();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    await db.$client.end();
    process.exit(1);
  }
}

main();
