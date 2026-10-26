import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products } from "../../lib/db";
import { gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. GET INVOICES FOR PROCESSING (last 90 days for detailed analytics)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoDate = threeMonthsAgo.toISOString().split('T')[0];

    const recentInvoices = await db
      .select()
      .from(invoices)
      .where(gte(invoices.date, threeMonthsAgoDate));

    // 2. SUMMARY STATS (Total from all time) via SQL aggregations
    const [invoiceTotals] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${invoices.amount}), 0)`,
        totalOrders: sql<number>`count(*)`,
        uniqueCustomers: sql<number>`count(distinct ${invoices.customer})`,
      })
      .from(invoices);

    const totalRevenue = parseFloat(invoiceTotals?.totalRevenue || "0");
    const totalOrders = Number(invoiceTotals?.totalOrders || 0);
    const uniqueCustomers = Number(invoiceTotals?.uniqueCustomers || 0);

    // Inventory Value
    const [inventoryTotals] = await db
      .select({
        inventoryValue: sql<string>`coalesce(sum(coalesce(${products.price}, 0) * coalesce(${products.quantity}, 0)), 0)`,
      })
      .from(products);

    const inventoryValue = parseFloat(inventoryTotals?.inventoryValue || "0");

    // 3. TRENDS (Last 30 Days) via SQL group by date
    const trendRows = await db
      .select({
        date: invoices.date,
        revenue: sql<string>`coalesce(sum(${invoices.amount}), 0)`,
        orders: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(gte(invoices.date, threeMonthsAgoDate))
      .groupBy(invoices.date);

    const trendMap = new Map(
      trendRows.map((row) => [row.date, { revenue: parseFloat(row.revenue), orders: Number(row.orders) }])
    );

    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const revenueTrend = last30Days.map(day => {
      const dayData = trendMap.get(day);
      return {
        date: day,
        revenue: dayData?.revenue ?? 0,
        orders: dayData?.orders ?? 0
      };
    });

    // 4. CATEGORY DISTRIBUTION & 5. TOP PRODUCTS (computed from invoice items jsonb)
    const productCategoryMap: Record<string, string> = {};
    const allProducts = await db
      .select({ id: products.id, category: products.category })
      .from(products);
    allProducts.forEach(prod => {
      const cat = prod.category && Array.isArray(prod.category) && prod.category.length > 0
        ? prod.category[0]
        : "Equipment";
      productCategoryMap[prod.id] = cat;
    });

    const categorySales: Record<string, number> = {};
    const productSales: Record<string, {name: string, revenue: number, quantity: number}> = {};

    recentInvoices.forEach(inv => {
      ((inv.items as any[]) || []).forEach((item: any) => {
        const cat = productCategoryMap[item.productId] || item.category || "General";
        categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);

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
