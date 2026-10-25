import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products } from "../../lib/db";
import { gte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. GET ALL INVOICES FOR PROCESSING (last 90 days)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const invoicesRows = await db
      .select()
      .from(invoices)
      .where(gte(invoices.createdAt, threeMonthsAgo));

    // 2. SUMMARY STATS (Total from all time)
    const [totals] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
        totalOrders: sql<number>`count(*)::int`,
        uniqueCustomers: sql<number>`count(distinct ${invoices.customerName})::int`,
      })
      .from(invoices);

    const totalRevenue = Number(totals?.totalRevenue ?? 0);
    const totalOrders = totals?.totalOrders ?? 0;
    const uniqueCustomers = totals?.uniqueCustomers ?? 0;

    // Inventory Value
    const [productTotals] = await db
      .select({
        inventoryValue: sql<string>`coalesce(sum(${products.price} * ${products.quantity}), 0)`,
      })
      .from(products);
    const inventoryValue = Number(productTotals?.inventoryValue ?? 0);

    // 3. TRENDS (Last 30 Days) — grouped by day via SQL
    const trendRows = await db
      .select({
        date: sql<string>`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
        orders: sql<number>`count(*)::int`,
      })
      .from(invoices)
      .where(gte(invoices.createdAt, sql`now() - interval '30 days'`))
      .groupBy(sql`to_char(${invoices.createdAt}, 'YYYY-MM-DD')`);

    const trendMap = new Map(trendRows.map((r) => [r.date, r]));
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const revenueTrend = last30Days.map((day) => {
      const row = trendMap.get(day);
      return {
        date: day,
        revenue: Number(row?.revenue ?? 0),
        orders: row?.orders ?? 0,
      };
    });

    // 4. CATEGORY DISTRIBUTION (items stored as jsonb)
    const productCategoryMap: Record<string, string> = {};
    const allProducts = await db.select().from(products);
    allProducts.forEach((prod) => {
      const cat =
        Array.isArray(prod.category) && prod.category.length > 0
          ? prod.category[0]
          : "Equipment";
      productCategoryMap[prod.id] = cat;
    });

    const categorySales: Record<string, number> = {};
    invoicesRows.forEach((inv) => {
      const items = (inv.items as any[]) || [];
      items.forEach((item) => {
        const cat =
          productCategoryMap[item.productId] || item.category || "General";
        categorySales[cat] =
          (categorySales[cat] || 0) + Number(item.price) * item.quantity;
      });
    });

    // 5. TOP PRODUCTS
    const productSales: Record<
      string,
      { name: string; revenue: number; quantity: number }
    > = {};
    invoicesRows.forEach((inv) => {
      const items = (inv.items as any[]) || [];
      items.forEach((item) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.name,
            revenue: 0,
            quantity: 0,
          };
        }
        productSales[item.productId].revenue +=
          Number(item.price) * item.quantity;
        productSales[item.productId].quantity += item.quantity;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            totalRevenue,
            totalOrders,
            uniqueCustomers,
            inventoryValue,
            averageOrderValue:
              totalOrders > 0 ? totalRevenue / totalOrders : 0,
          },
          trends: revenueTrend,
          categories: Object.entries(categorySales).map(([name, value]) => ({
            name,
            value,
          })),
          topProducts,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 }
    );
  }
}
