import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "../../../lib/db";
import { sql, desc, lt, gte } from "drizzle-orm";
import { transformProduct } from "../../../lib/api/utils";

export async function GET(request: NextRequest) {
  try {
    // 1. RECENT INVOICES (Latest 5)
    const recentInvoices = await db
      .select()
      .from(schema.invoices)
      .orderBy(desc(schema.invoices.createdAt))
      .limit(5);

    // 2. ANALYTICS DATA (Revenue, Orders, Customers)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const periodInvoices = await db
      .select()
      .from(schema.invoices)
      .where(gte(schema.invoices.createdAt, threeMonthsAgo));

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

    // 3. PRODUCT SUMMARY & LOW STOCK
    const [inventoryTotals] = await db
      .select({
        totalInventoryCount: sql<number>`coalesce(sum(${schema.products.quantity}), 0)::int`,
        inventoryValue: sql<string>`coalesce(sum(${schema.products.price} * ${schema.products.quantity}), 0)`,
      })
      .from(schema.products);

    const totalInventoryCount = Number(inventoryTotals?.totalInventoryCount ?? 0);
    const inventoryValue = Number(inventoryTotals?.inventoryValue ?? 0);

    const lowStockItems = await db
      .select()
      .from(schema.products)
      .where(lt(schema.products.quantity, 3))
      .orderBy(schema.products.quantity)
      .limit(5);

    // 4. TRENDS (Last 30 Days) — aggregated in SQL
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

    const trendMap = new Map(
      trendRows.map((row) => [row.date, row])
    );

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

    // 5. CATEGORY DISTRIBUTION & 6. TOP PRODUCTS (from invoice items jsonb)
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
    const productSalesMap: Record<
      string,
      { name: string; revenue: number; quantity: number }
    > = {};

    periodInvoices.forEach((inv) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      items.forEach((item: any) => {
        const cat =
          productCategoryMap[item.productId] || item.category || "General";
        const lineTotal = Number(item.price) * Number(item.quantity);
        categorySales[cat] = (categorySales[cat] || 0) + lineTotal;

        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.name,
            revenue: 0,
            quantity: 0,
          };
        }
        productSalesMap[item.productId].revenue += lineTotal;
        productSalesMap[item.productId].quantity += Number(item.quantity);
      });
    });

    const topProducts = Object.values(productSalesMap)
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
            totalInventoryCount,
            averageOrderValue:
              totalOrders > 0 ? totalRevenue / totalOrders : 0,
          },
          recentInvoices: recentInvoices.map((inv) => ({
            ...inv,
            totalAmount: Number(inv.totalAmount),
          })),
          lowStockItems: lowStockItems.map(transformProduct),
          analytics: {
            trends: revenueTrend,
            categories: Object.entries(categorySales).map(([name, value]) => ({
              name,
              value,
            })),
            topProducts,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard Summary Error:", error);
    return NextResponse.json(
      { error: "Failed to generate dashboard summary" },
      { status: 500 }
    );
  }
}
