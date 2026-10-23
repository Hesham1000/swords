import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { invoices, products } from "../../lib/db/schema";
import { gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. INVOICES FROM THE LAST 90 DAYS for detailed analytics
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const periodStart = threeMonthsAgo.toISOString().split("T")[0];

    const periodRows = await db
      .select()
      .from(invoices)
      .where(gte(invoices.invoiceDate, periodStart));

    // 2. SUMMARY STATS (Total from all time)
    const allInvoices = await db.select().from(invoices);
    const totalRevenue = allInvoices.reduce((acc, inv) => acc + parseFloat(inv.total || "0"), 0);
    const totalOrders = allInvoices.length;
    const uniqueCustomers = new Set(allInvoices.map((inv) => inv.customerName)).size;

    // Inventory Value
    const allProducts = await db.select().from(products);
    const inventoryValue = allProducts.reduce(
      (acc, prod) => acc + parseFloat(prod.price || "0") * (prod.quantity || 0),
      0,
    );

    // 3. TRENDS (Last 30 Days)
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const revenueTrend = last30Days.map((day) => {
      const dayInvoices = periodRows.filter((inv) => inv.invoiceDate === day);
      return {
        date: day,
        revenue: dayInvoices.reduce((acc, inv) => acc + parseFloat(inv.total || "0"), 0),
        orders: dayInvoices.length,
      };
    });

    // 4. CATEGORY DISTRIBUTION
    const productCategoryMap: Record<string, string> = {};
    allProducts.forEach((prod) => {
      const cat =
        prod.category && Array.isArray(prod.category) && prod.category.length > 0
          ? prod.category[0]
          : "Equipment";
      productCategoryMap[prod.id] = cat;
    });

    const categorySales: Record<string, number> = {};
    periodRows.forEach((inv) => {
      ((inv.items as Array<{ productId?: string; category?: string; name?: string; price?: number; quantity?: number }>) || []).forEach((item) => {
        const cat = (item.productId ? productCategoryMap[item.productId] : undefined) || item.category || "General";
        categorySales[cat] = (categorySales[cat] || 0) + (item.price || 0) * (item.quantity || 0);
      });
    });

    // 5. TOP PRODUCTS
    const productSales: Record<string, { name: string; revenue: number; quantity: number }> = {};
    periodRows.forEach((inv) => {
      ((inv.items as Array<{ productId?: string; category?: string; name?: string; price?: number; quantity?: number }>) || []).forEach((item) => {
        if (!item.productId) return;
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.name || "", revenue: 0, quantity: 0 };
        }
        productSales[item.productId].revenue += (item.price || 0) * (item.quantity || 0);
        productSales[item.productId].quantity += item.quantity || 0;
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
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
        trends: revenueTrend,
        categories: Object.entries(categorySales).map(([name, value]) => ({ name, value })),
        topProducts,
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}
