import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products } from "../../../lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Fetch recent 5 invoices
    const recentInvoices = await db
      .select()
      .from(invoices)
      .orderBy(sql`${invoices.createdAt} DESC`)
      .limit(5);

    // Fetch invoices from the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const periodInvoices = await db
      .select()
      .from(invoices)
      .where(sql`${invoices.createdAt} >= ${threeMonthsAgo.toISOString()}`);

    // Fetch all products for inventory stats
    const allProducts = await db.select().from(products);

    // Calculate totals
    let revenue = 0;
    const customerSet = new Set<string>();
    for (const inv of periodInvoices) {
      revenue += Number(inv.totalAmount || 0);
      if (inv.customer) customerSet.add(inv.customer);
    }

    let inventoryValue = 0;
    let totalInventoryCount = 0;
    for (const prod of allProducts) {
      const price = Number(prod.price || 0);
      const qty = prod.quantity || 0;
      inventoryValue += price * qty;
      totalInventoryCount += qty;
    }
    const avgOrderValue = periodInvoices.length > 0 ? revenue / periodInvoices.length : 0;

    // 30-day revenue trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const trendInvoices = await db
      .select()
      .from(invoices)
      .where(sql`${invoices.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .orderBy(sql`${invoices.createdAt} ASC`);

    const trendMap = new Map<string, number>();
    for (const inv of trendInvoices) {
      const day = inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : "unknown";
      trendMap.set(day, (trendMap.get(day) || 0) + Number(inv.totalAmount || 0));
    }
    const revenueTrend = Array.from(trendMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    // Category distribution (via product map keyed by product id)
    const productCategoryMap = new Map<string, string[]>();
    for (const prod of allProducts) {
      productCategoryMap.set(prod.id, prod.category || []);
    }
    const categoryCount = new Map<string, number>();
    for (const inv of periodInvoices) {
      const items: any[] = Array.isArray(inv.items) ? inv.items : [];
      for (const item of items) {
        const cats = productCategoryMap.get(item.id) || [];
        for (const cat of cats) {
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + (item.quantity || 0));
        }
      }
    }
    const categoryDistribution = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Top 5 products by quantity sold
    const productCount = new Map<string, { name: string; count: number }>();
    for (const inv of periodInvoices) {
      const items: any[] = Array.isArray(inv.items) ? inv.items : [];
      for (const item of items) {
        const existing = productCount.get(item.id);
        if (existing) {
          existing.count += item.quantity || 0;
        } else {
          productCount.set(item.id, { name: item.name || "Unknown", count: item.quantity || 0 });
        }
      }
    }
    const topProducts = Array.from(productCount.entries())
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json(
      {
        success: true,
        data: {
          recentInvoices,
          periodInvoicesCount: periodInvoices.length,
          totals: {
            revenue,
            orders: periodInvoices.length,
            uniqueCustomers: customerSet.size,
            inventoryValue,
            totalInventoryCount,
            avgOrderValue,
          },
          revenueTrend,
          categoryDistribution,
          topProducts,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
