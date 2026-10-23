import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { invoices, products } from "../../../lib/db/schema";
import { desc, gte } from "drizzle-orm";
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
      .where(gte(invoices.date, threeMonthsAgo.toISOString().split('T')[0]));

    const allInvoices = await db.select().from(invoices);
    const totalRevenue = allInvoices.reduce((acc, inv) => acc + (parseFloat(inv.amount || "0") || 0), 0);
    const totalOrders = allInvoices.length;
    const uniqueCustomers = new Set(allInvoices.map(inv => inv.customer)).size;

    // 3. PRODUCT SUMMARY & LOW STOCK
    const allProducts = await db.select().from(products);
    const totalInventoryCount = allProducts.reduce((acc, prod) => acc + (prod.quantity || 0), 0);
    const inventoryValue = allProducts.reduce((acc, prod) => acc + ((parseFloat(prod.price || "0") || 0) * (prod.quantity || 0)), 0);

    const lowStockItems = allProducts
      .filter(p => (p.quantity || 0) < 3)
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 5);

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
        revenue: dayInvoices.reduce((acc, inv) => acc + (parseFloat(inv.amount || "0") || 0), 0),
        orders: dayInvoices.length
      };
    });

    // 5. CATEGORY DISTRIBUTION
    const productCategoryMap: Record<string, string> = {};
    allProducts.forEach(prod => {
      const cat = prod.category && Array.isArray(prod.category) && prod.category.length > 0
        ? prod.category[0]
        : (typeof prod.category === 'string' ? prod.category : "Equipment");
      productCategoryMap[prod.id] = cat ?? "Equipment";
    });

    const categorySales: Record<string, number> = {};
    periodInvoices.forEach(inv => {
      ((inv.items as Array<Record<string, unknown>>) || []).forEach((item) => {
        const cat = productCategoryMap[String(item.productId)] || (item.category as string) || "General";
        categorySales[cat] = (categorySales[cat] || 0) + (Number(item.price) * Number(item.quantity));
      });
    });

    // 6. TOP PRODUCTS
    const productSalesMap: Record<string, {name: string, revenue: number, quantity: number}> = {};
    periodInvoices.forEach(inv => {
      ((inv.items as Array<Record<string, unknown>>) || []).forEach((item) => {
        if (!productSalesMap[String(item.productId)]) {
          productSalesMap[String(item.productId)] = { name: String(item.name ?? ""), revenue: 0, quantity: 0 };
        }
        productSalesMap[String(item.productId)].revenue += (Number(item.price) * Number(item.quantity));
        productSalesMap[String(item.productId)].quantity += Number(item.quantity);
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
        lowStockItems: lowStockItems.map(transformProduct),
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
