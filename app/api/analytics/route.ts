import { NextRequest, NextResponse } from "next/server";
import { gte } from "drizzle-orm";
import { db, invoices, products } from "../../lib/db";

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
    amount: parseFloat(String(r.totalAmount ?? 0)),
    status: r.status,
    paymentMethod: r.paymentMethod,
    date: r.date,
    items: r.items as InvoiceItem[] | null,
    deposit: parseFloat(String(r.deposit ?? 0)),
    createdAt: r.createdAt,
  };
}

// Map a Drizzle product row to the response shape the frontend expects
function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    price: parseFloat(String(p.price ?? 0)),
    category: p.category,
    quantity: p.quantity,
  };
}

export async function GET(request: NextRequest) {
  try {
    // 1. GET ALL INVOICES FOR PROCESSING (last 90 days for detailed analytics)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const periodStart = threeMonthsAgo.toISOString().split('T')[0];

    const periodRows = await db
      .select()
      .from(invoices)
      .where(gte(invoices.date, periodStart));
    const periodInvoices = periodRows.map(mapInvoice);

    // 2. SUMMARY STATS (Total from all time)
    const allRows = await db.select().from(invoices);
    const allInvoices = allRows.map(mapInvoice);
    const totalRevenue = allInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
    const totalOrders = allInvoices.length;

    // Unique customers
    const uniqueCustomers = new Set(allInvoices.map(inv => inv.customer)).size;

    // Inventory Value
    const allProductRows = await db.select().from(products);
    const allProducts = allProductRows.map(mapProduct);
    const inventoryValue = allProducts.reduce((acc, prod) => acc + ((prod.price || 0) * (prod.quantity || 0)), 0);

    // 3. TRENDS (Last 30 Days)
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

    // 4. CATEGORY DISTRIBUTION
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

    // 5. TOP PRODUCTS
    const productSales: Record<string, {name: string, revenue: number, quantity: number}> = {};
    periodInvoices.forEach(inv => {
      (inv.items || []).forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name, revenue: 0, quantity: 0 };
        }
        productSales[item.productId].revenue += (item.price * item.quantity);
        productSales[item.productId].quantity += item.quantity;
      });
    });

    const topProducts = Object.values(productSales)
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
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        trends: revenueTrend,
        categories: Object.entries(categorySales).map(([name, value]) => ({ name, value })),
        topProducts
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}
