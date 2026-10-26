import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products, shipments } from "../../../lib/db";
import { transformProduct } from "../../../lib/api/utils";
import { desc, gte, asc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // 1. RECENT INVOICES (Latest 5)
    const recentInvoices = await db
      .select()
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(5);

    // 2. ANALYTICS DATA (Revenue, Orders, Customers) via SQL aggregations
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoDate = threeMonthsAgo.toISOString().split('T')[0];

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

    // 3. PRODUCT SUMMARY & LOW STOCK via SQL aggregations
    const [productTotals] = await db
      .select({
        totalProducts: sql<number>`count(*)`,
        totalInventoryCount: sql<string>`coalesce(sum(coalesce(${products.quantity}, 0)), 0)`,
        inventoryValue: sql<string>`coalesce(sum(coalesce(${products.price}, 0) * coalesce(${products.quantity}, 0)), 0)`,
      })
      .from(products);

    const totalInventoryCount = Number(productTotals?.totalInventoryCount || 0);
    const inventoryValue = parseFloat(productTotals?.inventoryValue || "0");

    const lowStockRows = await db
      .select()
      .from(products)
      .where(sql`coalesce(${products.quantity}, 0) < 3`)
      .orderBy(asc(products.quantity))
      .limit(5);

    // 4. RECENT SHIPMENTS (Latest 5)
    const recentShipments = await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.createdAt))
      .limit(5);

    // 5. TRENDS (Last 30 Days) via SQL group by date
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

    // 6. CATEGORY DISTRIBUTION & 7. TOP PRODUCTS (from invoice items jsonb)
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

    const periodInvoices = await db
      .select()
      .from(invoices)
      .where(gte(invoices.date, threeMonthsAgoDate));

    const categorySales: Record<string, number> = {};
    const productSalesMap: Record<string, {name: string, revenue: number, quantity: number}> = {};

    periodInvoices.forEach(inv => {
      ((inv.items as any[]) || []).forEach((item: any) => {
        const cat = productCategoryMap[item.productId] || item.category || "General";
        categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);

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
          totalProducts: Number(productTotals?.totalProducts || 0),
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        },
        recentInvoices,
        recentShipments,
        lowStockItems: lowStockRows.map(transformProduct),
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
