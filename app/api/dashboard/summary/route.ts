import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products } from "../../../lib/db";
import { desc, gte, sql } from "drizzle-orm";
import { transformProduct } from "../../../lib/api/utils";

export async function GET(request: NextRequest) {
  try {
    // 1. RECENT INVOICES (Latest 5)
    const recentInvoices = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    // 2. ANALYTICS DATA (Revenue, Orders, Customers)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const periodInvoices = await db
      .select()
      .from(invoices)
      .where(gte(invoices.createdAt, threeMonthsAgo));

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

    // 3. PRODUCT SUMMARY & LOW STOCK
    const [productTotals] = await db
      .select({
        totalInventoryCount: sql<number>`coalesce(sum(${products.quantity}), 0)::int`,
        inventoryValue: sql<string>`coalesce(sum(${products.price} * ${products.quantity}), 0)`,
      })
      .from(products);

    const totalInventoryCount = productTotals?.totalInventoryCount ?? 0;
    const inventoryValue = Number(productTotals?.inventoryValue ?? 0);

    const lowStockRows = await db
      .select()
      .from(products)
      .where(sql`${products.quantity} < 3`)
      .orderBy(sql`${products.quantity} asc`)
      .limit(5);

    // 4. TRENDS (Last 30 Days) — grouped by day via SQL
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

    // 5. CATEGORY DISTRIBUTION (items stored as jsonb)
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
    periodInvoices.forEach((inv) => {
      const items = (inv.items as any[]) || [];
      items.forEach((item) => {
        const cat =
          productCategoryMap[item.productId] || item.category || "General";
        categorySales[cat] =
          (categorySales[cat] || 0) + Number(item.price) * item.quantity;
      });
    });

    // 6. TOP PRODUCTS
    const productSalesMap: Record<
      string,
      { name: string; revenue: number; quantity: number }
    > = {};
    periodInvoices.forEach((inv) => {
      const items = (inv.items as any[]) || [];
      items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            name: item.name,
            revenue: 0,
            quantity: 0,
          };
        }
        productSalesMap[item.productId].revenue +=
          Number(item.price) * item.quantity;
        productSalesMap[item.productId].quantity += item.quantity;
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
          recentInvoices,
          lowStockItems: lowStockRows.map(transformProduct),
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
