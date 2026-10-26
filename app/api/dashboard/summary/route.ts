import { NextRequest, NextResponse } from "next/server";
import { desc, gte, lt, sql } from "drizzle-orm";
import { db, invoices, products } from "../../../lib/db";

type InvoiceRow = typeof invoices.$inferSelect;
type ProductRow = typeof products.$inferSelect;
interface InvoiceItem {
  productId: string;
  category?: string;
  name: string;
  price: number;
  quantity: number;
}

// Map a Drizzle invoice row to the response shape the frontend expects
function mapInvoice(r: InvoiceRow) {
  return {
    id: r.id,
    invoiceId: r.invoiceNumber,
    customer: r.customerName,
    customerEmail: r.customerEmail,
    customerPhone: r.customerPhone,
    amount: parseFloat(String(r.totalAmount ?? 0)),
    discount: parseFloat(String(r.discount ?? 0)),
    status: r.status,
    paymentMethod: r.paymentMethod,
    date: r.date,
    items: r.items as InvoiceItem[] | null,
    deposit: parseFloat(String(r.deposit ?? 0)),
    depositCurrency: r.depositCurrency,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// Map a Drizzle product row to the response shape the frontend expects
function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(String(p.price ?? 0)),
    category: p.category,
    productType: p.productType,
    brand: p.brand,
    model: p.model,
    subCategory: p.subCategory,
    hand: p.hand,
    isKings: p.isKings,
    isMini: p.isMini,
    lameColor: p.lameColor,
    material: p.material,
    gloveSize: p.gloveSize,
    quantity: p.quantity,
    images: p.images,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1. RECENT INVOICES (Latest 5)
    const recentRows = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(5);
    const recentInvoices = recentRows.map(mapInvoice);

    // 2. ANALYTICS DATA (Revenue, Orders, Customers)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const periodStart = threeMonthsAgo.toISOString().split('T')[0];

    const periodRows = await db
      .select()
      .from(invoices)
      .where(gte(invoices.date, periodStart));
    const periodInvoices = periodRows.map(mapInvoice);

    const allRows = await db.select().from(invoices);
    const allInvoices = allRows.map(mapInvoice);
    const totalRevenue = allInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
    const totalOrders = allInvoices.length;
    const uniqueCustomers = new Set(allInvoices.map(inv => inv.customer)).size;

    // 3. PRODUCT SUMMARY & LOW STOCK
    const allProductRows = await db.select().from(products);
    const allProducts = allProductRows.map(mapProduct);
    const totalInventoryCount = allProducts.reduce((acc, prod) => acc + (prod.quantity || 0), 0);
    const inventoryValue = allProducts.reduce((acc, prod) => acc + ((prod.price || 0) * (prod.quantity || 0)), 0);

    const lowStockRows = await db
      .select()
      .from(products)
      .where(lt(products.quantity, 3))
      .orderBy(sql`${products.quantity} ASC`)
      .limit(5);
    const lowStockItems = lowStockRows.map(mapProduct);

    // 4. TRENDS (Last 30 Days)
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const revenueTrend = last30Days.map(day => {
      const dayInvoices = periodInvoices.filter(inv => inv.date === day);
      return {
        date: day,
        revenue: dayInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0),
        orders: dayInvoices.length
      };
    });

    // 5. CATEGORY DISTRIBUTION
    const productCategoryMap: Record<string, string> = {};
    allProducts.forEach(prod => {
      const cat = prod.category && Array.isArray(prod.category) && prod.category.length > 0
        ? prod.category[0]
        : (typeof prod.category === 'string' ? prod.category : "Equipment");
      productCategoryMap[prod.id] = cat;
    });

    const categorySales: Record<string, number> = {};
    periodInvoices.forEach(inv => {
      (inv.items || []).forEach((item) => {
        const cat = productCategoryMap[item.productId] || item.category || "General";
        categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);
      });
    });

    // 6. TOP PRODUCTS
    const productSalesMap: Record<string, {name: string, revenue: number, quantity: number}> = {};
    periodInvoices.forEach(inv => {
      (inv.items || []).forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { name: item.name, revenue: 0, quantity: 0 };
        }
        productSalesMap[item.productId].revenue += (item.price * item.quantity);
        productSalesMap[item.productId].quantity += item.quantity;
      });
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders,
          uniqueCustomers,
          inventoryValue,
          totalInventoryCount,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        recentInvoices,
        lowStockItems,
        analytics: {
          trends: revenueTrend,
          categories: Object.entries(categorySales).map(([name, value]) => ({ name, value })),
          topProducts
        }
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    return NextResponse.json({ error: "Failed to generate dashboard summary" }, { status: 500 });
  }
}
