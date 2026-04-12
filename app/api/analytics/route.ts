import { NextRequest, NextResponse } from "next/server";
import { getInvoicesCollection, getProductsCollection } from "../../lib/mongoDB";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const invoicesCollection = await getInvoicesCollection();
    const productsCollection = await getProductsCollection();

    // 1. GET ALL INVOICES FOR PROCESSING
    // We fetch a reasonable range (last 90 days) for detailed analytics
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const invoices = await invoicesCollection.find({
      date: { $gte: threeMonthsAgo.toISOString().split('T')[0] }
    }).toArray();

    // 2. SUMMARY STATS (Total from all time)
    const allInvoices = await invoicesCollection.find({}).toArray();
    const totalRevenue = allInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
    const totalOrders = allInvoices.length;
    
    // Unique customers
    const uniqueCustomers = new Set(allInvoices.map(inv => inv.customer)).size;

    // Inventory Value
    const allProducts = await productsCollection.find({}).toArray();
    const inventoryValue = allProducts.reduce((acc, prod) => acc + ((prod.price || 0) * (prod.quantity || 0)), 0);

    // 3. TRENDS (Last 30 Days)
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const revenueTrend = last30Days.map(day => {
      const dayInvoices = invoices.filter(inv => inv.date === day);
      return {
        date: day,
        revenue: dayInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0),
        orders: dayInvoices.length
      };
    });

    // 4. CATEGORY DISTRIBUTION
    const productCategoryMap: Record<string, string> = {};
    allProducts.forEach(prod => {
      const cat = prod.category && Array.isArray(prod.category) && prod.category.length > 0 
        ? prod.category[0] 
        : (typeof prod.category === 'string' ? prod.category : "Equipment");
      productCategoryMap[prod._id.toString()] = cat;
    });

    const categorySales: Record<string, number> = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
        const cat = productCategoryMap[item.productId] || item.category || "General";
        categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);
      });
    });

    // 5. TOP PRODUCTS
    const productSales: Record<string, {name: string, revenue: number, quantity: number}> = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
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
