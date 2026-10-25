import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "../../lib/db";
import { sql, gte } from "drizzle-orm";

interface InvoiceItemRow {
  productId: string;
  name: string;
  category?: string;
  price?: number | string;
  quantity?: number | string;
}

export async function GET(request: NextRequest) {
  try {
    // 1. INVOICES FOR PROCESSING (last 90 days)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const invoices = await db
      .select()
      .from(schema.invoices)
      .where(gte(schema.invoices.createdAt, threeMonthsAgo));

    // 2. SUMMARY STATS (Total from all time) — aggregated in SQL
    const [totals] = await db
      .select({
        totalRevenue: sql<string>`coalesce(sum(${schema.invoices.totalAmount}), 0)`,
        totalOrders: sql<number>`count(*)::int`,
        uniqueCustomers: sql<number>`count(distinct ${schema.invoices.customerName})::int`,
      })
      .from(schema.invoices);

    const totalRevenue = Number(totals?.totalRevenue ?? 0);
    const totalOrders = Number(totals?.totalOrders ?? 0);
    const uniqueCustomers = Number(totals?.uniqueCustomers ?? 0);

    // Inventory Value — aggregated in SQL
    const [inventoryTotals] = await db
      .select({
        inventoryValue: sql<string>`coalesce(sum(${schema.products.price} * ${schema.products.quantity}), 0)`,
      })
      .from(schema.products);

    const inventoryValue = Number(inventoryTotals?.inventoryValue ?? 0);

    // 3. TRENDS (Last 30 Days) — aggregated in SQL
    const trendRows = await db
      .select({
        date: sql<string>`to_char(${schema.invoices.createdAt}, 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${schema.invoices.totalAmount}), 0)`,
        orders: sql<number>`count(*)::int`,
      })
      .from(schema.invoices)
      .where(
        gte(
          schema.invoices.createdAt,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        )
      )
      .groupBy(sql`to_char(${schema.invoices.createdAt}, 'YYYY-MM-DD')`);

    const trendMap = new Map(trendRows.map((row) => [row.date, row]));

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
        orders: Number(row?.orders ?? 0),
      };
    });

    // 4. CATEGORY DISTRIBUTION & 5. TOP PRODUCTS (from invoice items jsonb)
    const productCategoryMap: Record<string, string> = {};
    const allProducts = await db
      .select({
        id: schema.products.id,
        category: schema.products.category,
      })
      .from(schema.products);
    allProducts.forEach((prod) => {
      const cat =
        prod.category && Array.isArray(prod.category) && prod.category.length > 0
          ? prod.category[0]
          : "Equipment";
      productCategoryMap[prod.id] = cat;
    });

    const categorySales: Record<string, number> = {};
    const productSales: Record<
      string,
      { name: string; revenue: number; quantity: number }
    > = {};

    invoices.forEach((inv) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      items.forEach((item: InvoiceItemRow) => {
        const cat =
          productCategoryMap[item.productId] || item.category || "General";
        const lineTotal = Number(item.price) * Number(item.quantity);
        categorySales[cat] = (categorySales[cat] || 0) + lineTotal;

        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.name,
            revenue: 0,
            quantity: 0,
          };
        }
        productSales[item.productId].revenue += lineTotal;
        productSales[item.productId].quantity += Number(item.quantity);
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
