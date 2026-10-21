import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { transformProduct } from "../../../lib/api/utils";

export async function GET(request: NextRequest) {
  try {
    // 1. RECENT INVOICES (Latest 5)
    const recentInvoicesResult = await query(
      `SELECT id, invoice_id AS "invoiceId", customer, amount, discount, status,
              payment_method AS "paymentMethod", date, items, deposit,
              deposit_currency AS "depositCurrency", created_at AS "createdAt"
       FROM invoices
       ORDER BY created_at DESC
       LIMIT 5`
    );
    const recentInvoices = recentInvoicesResult.rows;

    // 2. ANALYTICS DATA (Revenue, Orders, Customers)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const periodInvoicesResult = await query(
      `SELECT id, invoice_id AS "invoiceId", customer, amount, discount, status,
              payment_method AS "paymentMethod", date, items, deposit
       FROM invoices
       WHERE date >= $1`,
      [threeMonthsAgo.toISOString().split('T')[0]]
    );
    const periodInvoices = periodInvoicesResult.rows;

    const allInvoicesResult = await query(
      `SELECT id, customer, amount, date, items FROM invoices`
    );
    const allInvoices = allInvoicesResult.rows;
    const totalRevenue = allInvoices.reduce((acc, inv) => acc + (parseFloat(inv.amount) || 0), 0);
    const totalOrders = allInvoices.length;
    const uniqueCustomers = new Set(allInvoices.map(inv => inv.customer)).size;

    // 3. PRODUCT SUMMARY & LOW STOCK
    const allProductsResult = await query(
      `SELECT id, name, description, price, category, product_type AS "productType",
              brand, model, sub_category AS "subCategory", is_kings AS "isKings",
              is_mini AS "isMini", lame_color AS "lameColor", material, hand,
              glove_size AS "gloveSize", quantity, images,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM products`
    );
    const allProducts = allProductsResult.rows;
    const totalInventoryCount = allProducts.reduce((acc, prod) => acc + (prod.quantity || 0), 0);
    const inventoryValue = allProducts.reduce((acc, prod) => acc + ((parseFloat(prod.price) || 0) * (prod.quantity || 0)), 0);

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
        revenue: dayInvoices.reduce((acc, inv) => acc + (parseFloat(inv.amount) || 0), 0),
        orders: dayInvoices.length
      };
    });

    // 5. CATEGORY DISTRIBUTION
    const productCategoryMap: Record<string, string> = {};
    allProducts.forEach(prod => {
      const cat = prod.category && Array.isArray(prod.category) && prod.category.length > 0
        ? prod.category[0]
        : (typeof prod.category === 'string' ? prod.category : "Equipment");
      productCategoryMap[prod.id] = cat;
    });

    const categorySales: Record<string, number> = {};
    periodInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
        const cat = productCategoryMap[item.productId] || item.category || "General";
        categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);
      });
    });

    // 6. TOP PRODUCTS
    const productSalesMap: Record<string, {name: string, revenue: number, quantity: number}> = {};
    periodInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
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
