"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  DollarSign,
  Users,
  ShoppingCart,
  AlertCircle,
  Menu,
  X,
  Plus,
  Trash2,
  Edit,
  Wallet,
  Truck,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle,
  Search,
  Loader2,
} from "lucide-react";
import Sidebar from "../components/sidebar";
import ProductForm from "../components/productform";
import ProductsList from "../components/products-list";
import { getProducts, deleteProduct, Product } from "../lib/api/product";
import { getInvoices, updateInvoiceStatus, Invoice } from "../lib/api/invoice";
import { getWalletBalance, getWalletTransactions, WalletTransaction } from "../lib/api/wallet";
import InvoiceForm from "../components/invoice-form";
import WalletDepositForm from "../components/wallet-deposit-form";
import ShipmentForm from "../components/shipment-form";
import { getInventoryLogs, InventoryLog } from "../lib/api/inventory";
import { getAnalytics, AnalyticsData } from "../lib/api/analytics";
import { 
  motion, 
  AnimatePresence 
} from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser, User } from "../lib/api/auth";

const AdminLayoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showProductForm, setShowProductForm] = useState(false);
  const [refreshProducts, setRefreshProducts] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const tab = searchParams.get("tab");
  
  const isAdmin = user?.roles?.includes("admin");
  const allowedTabs = isAdmin ? ["dashboard", "products", "invoices", "wallet", "history"] : ["products"];
  const currentPage = (tab && allowedTabs.includes(tab)) ? tab : (isAdmin ? "dashboard" : "products");

  const [loading, setLoading] = useState(true); // Start loading true to fetch user
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPagination, setProductsPagination] = useState<any>(null);
  const [totalInventory, setTotalInventory] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBrand, setFilterBrand] = useState("");

  // Invoices state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesError, setInvoicesError] = useState<string>("");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [viewingItemsInvoice, setViewingItemsInvoice] = useState<Invoice | null>(null);
  const [refreshInvoices, setRefreshInvoices] = useState(false);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesPagination, setInvoicesPagination] = useState<any>(null);

  // Wallet state
  const [walletBalanceEGP, setWalletBalanceEGP] = useState(0);
  const [walletBalanceUSD, setWalletBalanceUSD] = useState(0);
  const [walletBalanceEUR, setWalletBalanceEUR] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string>("");
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [refreshWallet, setRefreshWallet] = useState(false);
  
  // Inventory History state
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [inventoryLogsLoading, setInventoryLogsLoading] = useState(false);
  const [inventoryLogsError, setInventoryLogsError] = useState<string>("");

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string>("");



  const handleNavigation = (page: string) => {
    setLoading(true);
    router.push(`/dashboard?tab=${page}`);
    setTimeout(() => setLoading(false), 500);
  };

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const data = await getCurrentUser();
      if (data) {
        setUser(data.user);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Fetch products and invoices for dashboard, or specific data for tabs
  useEffect(() => {
    if (loading) return; // Wait for user data

    if (currentPage === "dashboard" && isAdmin) {
      fetchProducts();
      fetchInvoices();
      fetchAnalyticsData();
    } else if (currentPage === "products") {
      fetchProducts(productsPage);
    } else if (currentPage === "wallet" && isAdmin) {
      fetchWalletData();
    } else if (currentPage === "history" && isAdmin) {
      fetchInventoryLogs();
    } else if (currentPage === "analytics" && isAdmin) {
      fetchAnalyticsData();
    }
  }, [currentPage, refreshProducts, refreshWallet, productsPage, searchQuery, filterCategory, filterType, filterBrand, loading, isAdmin]);

  useEffect(() => {
    if (currentPage === "invoices") {
      fetchInvoices(invoicesPage);
    }
  }, [currentPage, refreshInvoices, invoicesPage]);

  // Reset page when searching
  useEffect(() => {
    setInvoicesPage(1);
  }, [invoiceSearchQuery]);

  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const response = await getAnalytics();
      setAnalyticsData(response.data);
    } catch (error: any) {
      setAnalyticsError(error.message || "Failed to load analytics");
      console.error("Error fetching analytics:", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchInventoryLogs = async () => {
    setInventoryLogsLoading(true);
    setInventoryLogsError("");
    try {
      const response = await getInventoryLogs();
      setInventoryLogs(response.data);
    } catch (error: any) {
      setInventoryLogsError(error.message || "Failed to load history");
      console.error("Error fetching logs:", error);
    } finally {
      setInventoryLogsLoading(false);
    }
  };

  const fetchInvoices = async (page: number = 1) => {
    if (invoices.length === 0) setInvoicesLoading(true);
    setInvoicesError("");
    try {
      const response = await getInvoices(page, 10, invoiceSearchQuery);
      setInvoices(response.data);
      setInvoicesPagination(response.pagination);
    } catch (error: any) {
      setInvoicesError(error.message || "Failed to load invoices");
      console.error("Error fetching invoices:", error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchWalletData = async () => {
    if (walletTransactions.length === 0) setWalletLoading(true);
    setWalletError("");
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        getWalletBalance(),
        getWalletTransactions(),
      ]);
      setWalletBalanceEGP(balanceRes.data.balanceEGP);
      setWalletBalanceUSD(balanceRes.data.balanceUSD);
      setWalletBalanceEUR(balanceRes.data.balanceEUR);
      setWalletTransactions(transactionsRes.data);
    } catch (error: any) {
      setWalletError(error.message || "Failed to load wallet data");
      console.error("Error fetching wallet data:", error);
    } finally {
      setWalletLoading(false);
    }
  };

  const fetchProducts = async (page: number = 1) => {
    if (products.length === 0) setProductsLoading(true);
    setProductsError("");

    try {
      const isDashboard = currentPage === "dashboard";
      const response = await getProducts(page, 8, isDashboard, {
        search: searchQuery,
        category: filterCategory,
        productType: filterType,
        brand: filterBrand,
        dashboard: isDashboard
      });
      
      if (isDashboard) {
        if (response.summary) {
          setTotalInventory(response.summary.totalQuantity);
          setLowStockItems(response.summary.lowStockItems || []);
        }
      } else {
        setProducts(response.data);
        setProductsPagination(response.pagination);
      }
    } catch (error: any) {
      setProductsError(error.message || "Failed to load products");
      console.error("Error fetching products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      setProductsLoading(true);
      await deleteProduct(productId);
      setRefreshProducts(!refreshProducts);
    } catch (error: any) {
      setProductsError(error.message || "Failed to delete product");
      console.error("Error deleting product:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("Are you sure you want to mark this invoice as Paid? This will update your wallet balance.")) {
      return;
    }
    try {
      await updateInvoiceStatus(id, "paid");
      setRefreshInvoices(!refreshInvoices);
      setRefreshWallet(!refreshWallet);
    } catch (error: any) {
      console.error("Failed to mark invoice as paid:", error);
      alert(error.message || "Failed to update status");
    }
  };

  const handleAddDeposit = async (id: string) => {
    const amount = prompt("Enter deposit amount (EGP):");
    if (!amount) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      await updateInvoiceStatus(id, undefined, numAmount);
      setRefreshInvoices(!refreshInvoices);
      setRefreshWallet(!refreshWallet);
    } catch (error: any) {
      console.error("Failed to add deposit:", error);
      alert(error.message || "Failed to add deposit");
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  // Calculate dynamic stats
  const totalRevenue = invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0);
  const totalOrders = invoices.length;
  const totalInStock = currentPage === "dashboard" ? totalInventory : products.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const totalCustomers = Array.from(new Set(invoices.map(i => i.customer))).length;

  const stats = {
    totalRevenue,
    revenueChange: totalRevenue > 0 ? 12.5 : 0, // Mock change for now
    totalOrders,
    ordersChange: totalOrders > 0 ? 8.3 : 0,
    totalProducts: totalInStock,
    productsChange: totalInStock > 0 ? 5.2 : 0,
    totalCustomers,
    customersChange: totalCustomers > 0 ? 15.7 : 0,
  };

  const recentInvoices = invoices.slice(0, 5);

  // Calculate Top Selling Products from invoice items
  const productSalesMap: Record<string, { name: string; sales: number; revenue: number }> = {};
  invoices.forEach(inv => {
    (inv.items || []).forEach(item => {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.name, sales: 0, revenue: 0 };
      }
      productSalesMap[item.productId].sales += item.quantity;
      productSalesMap[item.productId].revenue += (item.price || 0) * item.quantity;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)
    .map(p => ({ ...p, change: 10 + Math.floor(Math.random() * 20) })); // Random change for aesthetic

  // Default to mock top products if none exist
  if (topProducts.length === 0) {
    topProducts.push(
      { name: "FIE Electric Epée", sales: 45, revenue: 13500, change: 23 },
      { name: "Premium Fencing Mask", sales: 67, revenue: 10050, change: 15 }
    );
  }

  // Calculate Monthly Sales Trend (6 months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString('default', { month: 'short' });
  }).reverse();

  const monthlySales = last6Months.map(month => {
    const monthInvoices = invoices.filter(inv => {
      const invMonth = new Date(inv.date).toLocaleString('default', { month: 'short' });
      return invMonth === month;
    });
    return {
      month,
      revenue: monthInvoices.reduce((acc, inv) => acc + (inv.amount || 0), 0),
      orders: monthInvoices.length
    };
  });

  // Fallback to mock data if no revenue in the last 6 months
  const hasRevenue = monthlySales.some(s => s.revenue > 0);
  if (!hasRevenue) {
    const mockValues = [45000, 52000, 48000, 61000, 55000, 67000];
    monthlySales.forEach((s, i) => {
      s.revenue = mockValues[i];
      s.orders = Math.floor(mockValues[i] / 400);
    });
  }

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    prefix = ""
  }: {
    title: string;
    value: number;
    change: number;
    icon: React.ElementType;
    prefix?: string;
  }) => (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div className={`stat-badge ${change >= 0 ? "positive" : "negative"}`}>
        {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{Math.abs(change)}%</span>
      </div>
      <h3 className="stat-title">{title}</h3>
      <p className="stat-value">
        {prefix}{value.toLocaleString()}
      </p>
    </div>
  );

  const DashboardContent = () => (
    <>
      <div className="stats-grid">
        <StatCard
          title="Revenue"
          value={stats.totalRevenue}
          change={stats.revenueChange}
          icon={DollarSign}
          prefix="EGP "
        />
        <StatCard
          title="Orders"
          value={stats.totalOrders}
          change={stats.ordersChange}
          icon={ShoppingCart}
        />
        <StatCard
          title="Inventory"
          value={stats.totalProducts}
          change={stats.productsChange}
          icon={Package}
        />
        <StatCard
          title="Audience"
          value={stats.totalCustomers}
          change={stats.customersChange}
          icon={Users}
        />
      </div>

      <div className="dashboard-grid">
        {/* Revenue Performance Area Chart (Premium) */}
        <div className="chart-card wide-chart">
          <div className="card-header">
            <h2 className="card-title">Revenue Performance</h2>
            <div className="header-actions">
               <button className="refresh-btn" onClick={fetchAnalyticsData} title="Update Analytics">
                  <TrendingUp size={14} className="refresh-icon" />
                  <span>Refresh</span>
               </button>
            </div>
          </div>
          <div className="area-chart-container">
             {analyticsLoading && !analyticsData ? (
               <div className="chart-inner-loading">
                 <Loader2 size={24} className="animate-spin" />
               </div>
             ) : analyticsData?.trends ? (
               <>
                 <svg viewBox="0 0 800 200" className="svg-area-chart">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    {[0, 50, 100, 150].map(y => (
                      <line key={y} x1="0" y1={y} x2="800" y2={y} stroke="var(--border-tech)" strokeDasharray="4 4" strokeOpacity="0.3" />
                    ))}
                    <path
                      d={`M 0 200 ${analyticsData.trends.map((t, i) => {
                        const maxRev = Math.max(...analyticsData.trends.map(d => d.revenue), 1);
                        const x = (i / (analyticsData.trends.length - 1)) * 800;
                        const y = 200 - (t.revenue / maxRev) * 150;
                        return `L ${x} ${y}`;
                      }).join(' ')} L 800 200 Z`}
                      fill="url(#areaGradient)"
                    />
                    <path
                      d={analyticsData.trends.map((t, i) => {
                        const maxRev = Math.max(...analyticsData.trends.map(d => d.revenue), 1);
                        const x = (i / (analyticsData.trends.length - 1)) * 800;
                        const y = 200 - (t.revenue / maxRev) * 150;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="var(--accent-blue)"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                 </svg>
                 <div className="chart-labels">
                    <span>{analyticsData.trends[0]?.date}</span>
                    <span>{analyticsData.trends[analyticsData.trends.length-1]?.date}</span>
                 </div>
               </>
             ) : (
               <div className="empty-chart">No trend data available</div>
             )}
          </div>
        </div>

        {/* Category Distribution Donut */}
        <div className="list-card donut-card">
          <div className="card-header">
            <h2 className="card-title">Sales by Category</h2>
          </div>
          <div className="donut-container">
             {analyticsLoading && !analyticsData ? (
                <div className="donut-inner-loading">
                   <Loader2 size={24} className="animate-spin" />
                </div>
             ) : analyticsData?.categories ? (
                <>
                  <svg viewBox="0 0 200 200" className="svg-donut">
                     {analyticsData.categories.map((cat, i) => {
                       const total = analyticsData.categories.reduce((sum, c) => sum + c.value, 0);
                       const startAngle = (analyticsData.categories.slice(0, i).reduce((sum, c) => sum + c.value, 0) / (total || 1)) * 360;
                       const angle = (cat.value / (total || 1)) * 360;
                       
                       const x1 = 100 + 70 * Math.cos((startAngle - 90) * Math.PI / 180);
                       const y1 = 100 + 70 * Math.sin((startAngle - 90) * Math.PI / 180);
                       const x2 = 100 + 70 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                       const y2 = 100 + 70 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                       
                       const colors = ['#3b82f6', '#fbbf24', '#f472b6', '#10b981'];
                       
                       return (
                         <path
                           key={cat.name}
                           d={`M ${x1} ${y1} A 70 70 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2}`}
                           fill="none"
                           stroke={colors[i % colors.length]}
                           strokeWidth="15"
                           strokeLinecap="round"
                         />
                       );
                     })}
                     <circle cx="100" cy="100" r="50" fill="var(--bg-deep)" />
                     <text x="100" y="105" textAnchor="middle" className="donut-center-text" fill="var(--text-primary)">
                        {analyticsData.categories.length} CATEGORIES
                     </text>
                  </svg>
                  <div className="donut-legend">
                     {analyticsData.categories.map((cat, i) => {
                       const total = analyticsData.categories.reduce((sum, c) => sum + c.value, 0);
                       return (
                         <div key={cat.name} className="legend-item">
                           <span className="legend-dot" style={{ background: ['#3b82f6', '#fbbf24', '#f472b6', '#10b981'][i % 4] }}></span>
                           <span className="legend-name">{cat.name}</span>
                           <span className="legend-value">{Math.round((cat.value / (total || 1)) * 100)}%</span>
                         </div>
                       );
                     })}
                  </div>
                </>
             ) : (
                <div className="empty-chart">No category data</div>
             )}
          </div>
        </div>

        <div className="list-card">
          <div className="card-header">
            <h2 className="card-title">Low Stock Alerts</h2>
            <div className={`alert-badge-count ${lowStockItems.length > 0 ? 'active' : ''}`}>
              {lowStockItems.length} Items
            </div>
          </div>
          <div className="alerts-list">
            {lowStockItems.length === 0 ? (
              <div className="empty-alerts">
                <CheckCircle size={32} />
                <p>All stock levels healthy</p>
              </div>
            ) : (
              lowStockItems.map(product => (
                <div key={product.id} className={`alert-item ${product.quantity === 0 ? 'critical' : 'warning'}`}>
                  <AlertCircle size={14} className="alert-icon" />
                  <div className="alert-info">
                    <span className="alert-name">{product.name}</span>
                    <span className="alert-stock">{product.quantity} left</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="list-card">
          <div className="card-header">
            <h2 className="card-title">Recent Invoices</h2>
          </div>
          <div className="invoice-list">
            {recentInvoices.map((invoice) => (
              <div
                key={invoice._id || invoice.invoiceId}
                className={`invoice-item status-${invoice.status}`}
              >
                <div className="invoice-id-col">
                  <div className="invoice-id">{invoice.invoiceId}</div>
                  <div className="invoice-customer">{invoice.customer}</div>
                </div>
                <div className="invoice-amount-col">
                  <div className="invoice-amount">
                    {invoice.amount.toLocaleString()} EGP
                  </div>
                  <div className="invoice-date">{invoice.date}</div>
                </div>
                <div className="invoice-actions-col">
                  <span className={`status-badge status-${invoice.status}`}>
                    {invoice.status === "overdue" && <AlertCircle size={14} />}
                    {invoice.status}
                  </span>
                  {invoice.status !== "paid" && (
                    <button 
                      className="mark-paid-btn dashboard-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsPaid(invoice._id!);
                      }}
                      title="Mark as Paid"
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}
                  
                </div>
              </div>
            ))}
          </div>
          <button
            className="view-all-btn"
            onClick={() => handleNavigation("invoices")}
          >
            View All Invoices
          </button>
        </div>
      </div>

      <div className="chart-card">
        <div className="card-header">
          <h2 className="card-title">Top Selling Products</h2>
        </div>
        <div className="products-leaderboard">
          {topProducts.map((product, idx) => {
            const maxSales = Math.max(...topProducts.map(p => p.sales));
            const progressWidth = (product.sales / maxSales) * 100;
            
            return (
              <div key={idx} className="leaderboard-item">
                <div className="item-rank">#{idx + 1}</div>
                <div className="item-details">
                  <div className="item-header">
                    <div className="item-name">{product.name}</div>
                    <div className="item-revenue">{product.revenue.toLocaleString()} EGP</div>
                  </div>
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${progressWidth}%` }}
                    >
                      <div className="progress-glow"></div>
                    </div>
                  </div>
                  <div className="item-footer">
                    <span className="item-sales">{product.sales} units sold</span>
                    <span className={`item-trend ${product.change >= 0 ? "positive" : "negative"}`}>
                      {product.change >= 0 ? "+" : ""}{product.change}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  const ProductsContent = () => (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        {isAdmin && (
          <button
            className="primary-btn"
            onClick={() => {
              setEditingProduct(null);
              setShowProductForm(true);
            }}
          >
            <Plus size={20} />
            Add New Product
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <Package size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setProductsPage(1);
            }}
            className="search-input"
          />
        </div>
        
        <div className="filters-selectors">
          <select 
            value={filterCategory} 
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setProductsPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="Epée">Epée</option>
            <option value="Foil">Foil</option>
            <option value="Sabre">Sabre</option>
          </select>

          <select 
            value={filterType} 
            onChange={(e) => {
              setFilterType(e.target.value);
              setProductsPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Types</option>
            <option value="lame">Lamé</option>
            <option value="wire">Wire</option>
            <option value="grip">Grip</option>
            <option value="guard">Guard</option>
            <option value="guard_padding">Guard Padding</option>
            <option value="french_pommel">French Pommel</option>
            <option value="nut">Nut</option>
            <option value="point">Point</option>
            <option value="screws">Screws</option>
            <option value="point_contact_springs">Springs</option>
            <option value="socket">Socket</option>
            <option value="insulating_tube">Insulating Tube</option>
            <option value="body_wire">Body Wire</option>
            <option value="cable">Cable</option>
            <option value="pin">Pin</option>
          </select>

          <select 
            value={filterBrand} 
            onChange={(e) => {
              setFilterBrand(e.target.value);
              setProductsPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Brands</option>
            <option value="pbt">PBT</option>
            <option value="dynamo">Dynamo</option>
            <option value="stm">STM</option>
            <option value="uhlmann">Uhlmann</option>
            <option value="allstar">Allstar</option>
            <option value="folo">Folo</option>
            <option value="chinese">Chinese</option>
          </select>

          {(searchQuery || filterCategory || filterType || filterBrand) && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery("");
                setFilterCategory("");
                setFilterType("");
                setFilterBrand("");
                setProductsPage(1);
              }}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {productsError && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{productsError}</span>
        </div>
      )}

      <ProductsList
        products={products}
        loading={productsLoading}
        onDelete={isAdmin ? handleDeleteProduct : () => {}}
        onEdit={isAdmin ? handleEditProduct : undefined}
        pagination={productsPagination}
        onPageChange={(page) => {
          setProductsPage(page);
          fetchProducts(page);
        }}
        isAdmin={isAdmin}
      />


      <AnimatePresence>
        {showProductForm && (
          <div className="management-modal-wrapper">
            {/* Backdrop & Overlay */}
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowProductForm(false);
                setEditingProduct(null);
              }}
            >
              {/* Modal Content */}
              <motion.div
                className="centered-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal itself
              >
                <div className="modal-header">
                  <h2 className="modal-title">
                    {editingProduct ? "Edit Product" : "Add New Item"}
                  </h2>
                  <button
                    className="close-modal-btn"
                    onClick={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <ProductForm
                    onClose={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                    }}
                    onSuccess={() => {
                      setRefreshProducts(!refreshProducts);
                      setShowProductForm(false);
                      setEditingProduct(null);
                    }}
                    initialData={editingProduct || undefined}
                    isEdit={!!editingProduct}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const InvoicesContent = () => (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <button
          className="primary-btn"
          onClick={() => setShowInvoiceForm(true)}
        >
          <Plus size={20} />
          Create Invoice
        </button>
      </div>

      {/* Invoice Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrapper">
          <FileText size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={invoiceSearchQuery}
            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        {invoiceSearchQuery && (
          <button 
            className="clear-filters-btn"
            onClick={() => setInvoiceSearchQuery("")}
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {invoicesError && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{invoicesError}</span>
        </div>
      )}

      {invoicesLoading ? (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="content-placeholder">
          <FileText size={64} />
          <h3>No invoices yet</h3>
          <p>
            Generate your first professional invoice to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="list-card active-list">
            <div className="invoice-list full-width">
              {invoices.map((invoice) => (
                <div
                  key={invoice._id || invoice.invoiceId}
                  className={`invoice-item status-${invoice.status}`}
                >
                  <div className="invoice-id-col">
                    <div className="invoice-id">{invoice.invoiceId}</div>
                    <div className="invoice-customer">{invoice.customer}</div>
                  </div>
                  <div className="invoice-amount-col">
                    <div className="invoice-amount">
                      {invoice.amount.toLocaleString()} EGP
                    </div>
                    <div className="invoice-date">{invoice.date}</div>
                  </div>
                    <div className="invoice-actions-col">
                      <button 
                        className="view-items-btn"
                        onClick={() => setViewingItemsInvoice(invoice)}
                        title="View Items"
                      >
                        <Package size={14} />
                        Items
                      </button>
                      <span className={`status-badge status-${invoice.status}`}>
                        {invoice.status === "overdue" && <AlertCircle size={14} />}
                        {invoice.status}
                      </span>
                      {invoice.status === "pending" && (
                        <button 
                          className="edit-invoice-btn"
                          onClick={() => handleEditInvoice(invoice)}
                          title="Edit Invoice"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(251, 191, 36, 0.1)',
                            color: '#fbbf24',
                            border: '1px solid #fbbf24',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                      )}
                      {invoice.status !== "paid" && (
                        <button 
                          className="mark-paid-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsPaid(invoice._id!);
                          }}
                        >
                          <CheckCircle size={14} />
                          Mark as Paid
                        </button>
                      )}
                    </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Pagination */}
          {invoicesPagination && invoicesPagination.totalPages > 1 && (
            <div className="pagination-wrapper invoice-pagination">
              <div className="pagination-controls">
                <button
                  className="pagination-arr-btn"
                  disabled={!invoicesPagination.hasPrevPage}
                  onClick={() => setInvoicesPage(invoicesPage - 1)}
                >
                  &lt;
                </button>
                
                <div className="pagination-pages">
                  {(() => {
                    const total = invoicesPagination.totalPages;
                    const current = invoicesPage;
                    const range = [];
                    const delta = 1;

                    for (let i = 1; i <= total; i++) {
                      if (
                        i === 1 || 
                        i === total || 
                        (i >= current - delta && i <= current + delta)
                      ) {
                        range.push(i);
                      } else if (range.length > 0 && range[range.length - 1] !== "...") {
                        range.push("...");
                      }
                    }

                    return range.map((p, idx) => (
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                      ) : (
                        <button
                          key={p}
                          className={`pagination-number-btn ${p === current ? 'active' : ''}`}
                          onClick={() => setInvoicesPage(p as number)}
                        >
                          {p}
                        </button>
                      )
                    ));
                  })()}
                </div>

                <button
                  className="pagination-arr-btn"
                  disabled={!invoicesPagination.hasNextPage}
                  onClick={() => setInvoicesPage(invoicesPage + 1)}
                >
                  &gt;
                </button>
              </div>
              <div className="pagination-summary">
                Showing <strong>{invoices.length}</strong> of <strong>{invoicesPagination.totalCount}</strong> invoices
              </div>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showInvoiceForm && (
          <div className="management-modal-wrapper">
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInvoiceForm(false)}
            >
              <motion.div
                className="centered-modal large-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 className="modal-title">{editingInvoice ? "Edit Invoice" : "Create New Invoice"}</h2>
                  <button
                    className="close-modal-btn"
                    onClick={() => {
                      setShowInvoiceForm(false);
                      setEditingInvoice(null);
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <InvoiceForm
                    onClose={() => {
                      setShowInvoiceForm(false);
                      setEditingInvoice(null);
                    }}
                    onSuccess={() => {
                      setRefreshInvoices(!refreshInvoices);
                      setShowInvoiceForm(false);
                      setEditingInvoice(null);
                    }}
                    initialData={editingInvoice || undefined}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}

        {viewingItemsInvoice && (
          <div className="management-modal-wrapper">
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingItemsInvoice(null)}
            >
              <motion.div
                className="centered-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <div className="header-info">
                    <h2 className="modal-title">Invoice Items</h2>
                    <p className="modal-subtitle">{viewingItemsInvoice.invoiceId} — {viewingItemsInvoice.customer}</p>
                  </div>
                  <button
                    className="close-modal-btn"
                    onClick={() => setViewingItemsInvoice(null)}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="invoice-detail-view">
                    <div className="items-table-header">
                      <span>Product</span>
                      <span className="text-center">Qty</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Total</span>
                    </div>
                    <div className="items-table-body">
                      {viewingItemsInvoice.items.map((item, idx) => (
                        <div key={idx} className="item-detail-row">
                          <div className="item-name-col">
                            <span className="name">{item.name}</span>
                            {item.discount > 0 && (
                              <span className="discount-tag">-{item.discount} EGP discount</span>
                            )}
                          </div>
                          <div className="item-qty-col text-center">{item.quantity}</div>
                          <div className="item-price-col text-right">
                             {(item.price || 0).toLocaleString()} EGP
                          </div>
                          <div className="item-total-col text-right">
                            {(( (item.price || 0) - (item.discount || 0) ) * item.quantity).toLocaleString()} EGP
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="invoice-summary-details">
                       {viewingItemsInvoice.discount > 0 && (
                        <div className="summary-row">
                          <span>Subtotal</span>
                          <span>{(viewingItemsInvoice.amount + viewingItemsInvoice.discount).toLocaleString()} EGP</span>
                        </div>
                       )}
                       {viewingItemsInvoice.discount > 0 && (
                        <div className="summary-row discount">
                          <span>Total Discount</span>
                          <span>-{viewingItemsInvoice.discount.toLocaleString()} EGP</span>
                        </div>
                       )}
                       <div className="summary-row grand-total">
                         <span>Grand Total</span>
                         <span>{viewingItemsInvoice.amount.toLocaleString()} EGP</span>
                       </div>
                       {viewingItemsInvoice.deposit && viewingItemsInvoice.deposit > 0 && (
                         <div className="summary-row deposit">
                           <span>Deposit Paid</span>
                           <span>{viewingItemsInvoice.deposit.toLocaleString()} EGP</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const walletTotalIncome = walletTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const walletTotalExpenses = walletTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const WalletContent = () => (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Wallet</h1>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="primary-btn wallet-deposit-btn"
            onClick={() => setShowDepositForm(true)}
          >
            <ArrowUpCircle size={18} />
            Deposit
          </button>
          <button
            className="primary-btn wallet-withdraw-btn"
            onClick={() => setShowWithdrawForm(true)}
          >
            <ArrowDownCircle size={18} />
            Withdraw
          </button>
          <button
            className="primary-btn wallet-shipment-btn"
            onClick={() => setShowShipmentForm(true)}
          >
            <Truck size={18} />
            Shipment
          </button>
        </div>
      </div>

      {walletError && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{walletError}</span>
        </div>
      )}

      {walletLoading ? (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading wallet...</p>
        </div>
      ) : (
        <>
          {/* Balance Cards */}
          <div className="wallet-balance-card">
            <div className="wallet-balance-glow"></div>
            <div className="wallet-balance-content">
              <div className="wallet-balance-icon">
                <Wallet size={36} />
              </div>
              <div className="wallet-balance-info">
                <div className="wallet-balance-label">BALANCES</div>
                <div className={`wallet-balance-value ${walletBalanceEGP < 0 ? 'negative' : ''}`}>
                  {walletBalanceEGP.toLocaleString()} <span className="wallet-currency">EGP</span>
                </div>
                <div className="wallet-balance-secondary">
                  {walletBalanceUSD > 0 && (
                    <span className="wallet-balance-alt">${walletBalanceUSD.toLocaleString()} <small>USD</small></span>
                  )}
                  {walletBalanceEUR > 0 && (
                    <span className="wallet-balance-alt">€{walletBalanceEUR.toLocaleString()} <small>EUR</small></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="wallet-stats-row">
            <div className="wallet-stat-card stat-income">
              <ArrowUpCircle size={20} />
              <div className="wallet-stat-info">
                <span className="wallet-stat-label">Total Income</span>
                <span className="wallet-stat-value">+{walletTotalIncome.toLocaleString()} EGP</span>
              </div>
            </div>
            <div className="wallet-stat-card stat-expenses">
              <ArrowDownCircle size={20} />
              <div className="wallet-stat-info">
                <span className="wallet-stat-label">Total Expenses</span>
                <span className="wallet-stat-value">-{walletTotalExpenses.toLocaleString()} EGP</span>
              </div>
            </div>
            <div className="wallet-stat-card stat-count">
              <FileText size={20} />
              <div className="wallet-stat-info">
                <span className="wallet-stat-label">Transactions</span>
                <span className="wallet-stat-value">{walletTransactions.length}</span>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="wallet-history-card">
            <div className="wallet-history-header">
              <h2 className="wallet-history-title">Transaction History</h2>
            </div>
            <div className="wallet-transactions-list">
              {walletTransactions.length === 0 ? (
                <div className="content-placeholder">
                  <Wallet size={48} />
                  <h3>No transactions yet</h3>
                  <p>Deposit cash or create a cash invoice to see transactions here.</p>
                </div>
              ) : (
                walletTransactions.map((tx, idx) => (
                  <div key={tx._id || idx} className={`wallet-tx-item tx-${tx.type}`}>
                    <div className="wallet-tx-icon">
                      {tx.type === 'deposit' && <ArrowUpCircle size={22} />}
                      {tx.type === 'withdraw' && <ArrowDownCircle size={22} />}
                      {tx.type === 'invoice' && <FileText size={22} />}
                      {tx.type === 'shipment' && <ArrowDownCircle size={22} />}
                    </div>
                    <div className="wallet-tx-info">
                      <div className="wallet-tx-type">
                        {tx.type === 'deposit' ? 'Deposit' : tx.type === 'withdraw' ? 'Withdrawal' : tx.type === 'invoice' ? 'Cash Invoice' : 'Shipment'}
                        {tx.currency && tx.currency !== 'EGP' && <span className="wallet-tx-currency-badge">{tx.currency}</span>}
                      </div>
                      <div className="wallet-tx-note">{tx.note}</div>
                    </div>
                    <div className="wallet-tx-right">
                      <div className={`wallet-tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} {tx.currency || 'EGP'}
                      </div>
                      <div className="wallet-tx-date">
                        {new Date(tx.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositForm && (
          <div className="management-modal-wrapper">
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDepositForm(false)}
            >
              <motion.div
                className="centered-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 className="modal-title">Deposit Cash</h2>
                  <button
                    className="close-modal-btn"
                    onClick={() => setShowDepositForm(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <WalletDepositForm
                    mode="deposit"
                    onClose={() => setShowDepositForm(false)}
                    onSuccess={() => {
                      setRefreshWallet(!refreshWallet);
                      setShowDepositForm(false);
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawForm && (
          <div className="management-modal-wrapper">
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawForm(false)}
            >
              <motion.div
                className="centered-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 className="modal-title">Withdraw Cash</h2>
                  <button
                    className="close-modal-btn"
                    onClick={() => setShowWithdrawForm(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <WalletDepositForm
                    mode="withdraw"
                    onClose={() => setShowWithdrawForm(false)}
                    onSuccess={() => {
                      setRefreshWallet(!refreshWallet);
                      setShowWithdrawForm(false);
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shipment Modal */}
      <AnimatePresence>
        {showShipmentForm && (
          <div className="management-modal-wrapper">
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShipmentForm(false)}
            >
              <motion.div
                className="centered-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2 className="modal-title">Create Shipment</h2>
                  <button
                    className="close-modal-btn"
                    onClick={() => setShowShipmentForm(false)}
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body">
                  <ShipmentForm
                    onClose={() => setShowShipmentForm(false)}
                    onSuccess={() => {
                      setRefreshWallet(!refreshWallet);
                      setShowShipmentForm(false);
                    }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  const HistoryContent = () => (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Inventory History</h1>
        <button className="refresh-btn" onClick={fetchInventoryLogs}>
          <TrendingUp size={16} className="refresh-icon" />
          <span>Refresh</span>
        </button>
      </div>
      
      {inventoryLogsLoading && inventoryLogs.length === 0 ? (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading history...</p>
        </div>
      ) : inventoryLogs.length === 0 ? (
        <div className="content-placeholder">
          <Package size={48} />
          <h3>No history recorded yet</h3>
          <p>Stock changes will appear here automatically.</p>
        </div>
      ) : (
        <div className="list-card active-list">
          <div className="history-list full-width">
            <div className="history-header-row">
              <span className="history-col-product">Product</span>
              <span className="history-col-change">Change</span>
              <span className="history-col-reason">Reason</span>
              <span className="history-col-date">Date</span>
            </div>
            {inventoryLogs.map((log) => (
              <div key={log._id || log.id} className="history-item">
                <div className="history-col-product">
                  <span className="log-product-name">{log.productName}</span>
                  <span className="log-product-id">ID: {log.productId}</span>
                </div>
                <div className="history-col-change">
                  {log.reason === "Price Update" ? (
                    <div className="price-evolution">
                      <span className="price-old">EGP {log.oldPrice?.toLocaleString()}</span>
                      <span className="price-arrow">→</span>
                      <span className="price-new">EGP {log.newPrice?.toLocaleString()}</span>
                    </div>
                  ) : (
                    <>
                      <span className={`log-amount ${log.changeAmount > 0 ? 'positive' : 'negative'}`}>
                        {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount}
                      </span>
                      <span className="log-new-qty">Balance: {log.newQuantity}</span>
                    </>
                  )}
                </div>
                <div className="history-col-reason">
                  <span className="log-reason">{log.reason}</span>
                  {log.note && <span className="log-note">{log.note}</span>}
                </div>
                <div className="history-col-date">
                  <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    switch (currentPage) {
      case "dashboard":
        return isAdmin ? DashboardContent() : ProductsContent();
      case "products":
        return ProductsContent();
      case "invoices":
        return isAdmin ? InvoicesContent() : ProductsContent();
      case "wallet":
        return isAdmin ? WalletContent() : ProductsContent();
      case "history":
        return isAdmin ? HistoryContent() : ProductsContent();
      default:
        return isAdmin ? DashboardContent() : ProductsContent();
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar Overlay for Mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        currentPage={currentPage}
        onNavigation={(page) => {
          handleNavigation(page);
          // Auto-close sidebar on mobile after navigation
          if (window.innerWidth <= 768) {
            setSidebarOpen(false);
          }
        }}
        sidebarOpen={sidebarOpen}
        user={user}
      />

      <main className={`main-content ${sidebarOpen ? "" : "expanded"}`}>
        <div className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2 className="topbar-title">
            {currentPage === "dashboard" && "Dashboard Overview"}
            {currentPage === "products" && "Products Management"}
            {currentPage === "invoices" && "Invoices Management"}
            {currentPage === "wallet" && "Wallet Management"}
          </h2>
          <div></div>
        </div>

        <div className="content-wrapper">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>

      <style jsx>{`
        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #991b1b;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

       .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e5e7eb;
          border-top-color: #7c2d3a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        :global(.invoice-id-col) { flex: 1.5; }
        :global(.invoice-amount-col) { flex: 1.5; }
        :global(.invoice-actions-col) { 
          flex: 2;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 1.5rem;
        }
        
        :global(.mark-paid-btn) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          position: relative;
          overflow: hidden;
        }

        :global(.mark-paid-btn)::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: 0.5s;
        }

        :global(.mark-paid-btn):hover {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }

        :global(.mark-paid-btn):hover::before {
          left: 100%;
        }

        :global(.mark-paid-btn):active {
          transform: translateY(0) scale(0.98);
        }

        :global(.mark-paid-btn) svg {
          transition: transform 0.3s ease;
        }

        :global(.mark-paid-btn):hover svg {
          transform: scale(1.2) rotate(360deg);
        }

        :global(.add-deposit-btn) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, var(--accent-blue) 0%, #2563eb 100%);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
          position: relative;
          overflow: hidden;
        }

        :global(.add-deposit-btn):hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
          border-color: rgba(255, 255, 255, 0.4);
        }

        :global(.add-deposit-btn):active {
          transform: translateY(0) scale(0.98);
        }

        :global(.invoice-item) div:not([class]) {
          /* Fallback for items not moved to cols yet if any */
          flex: 1;
        }

        :global(.edit-invoice-btn) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(var(--accent-gold-rgb, 251, 191, 36), 0.1);
          color: var(--accent-gold);
          border: 1px solid var(--accent-gold);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        :global(.edit-invoice-btn):hover {
          background: var(--accent-gold);
          color: var(--bg-deep);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        }

        :global(.view-items-btn) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid var(--border-tech);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        :global(.view-items-btn):hover {
          background: rgba(var(--accent-blue-rgb, 59, 130, 246), 0.1);
          border-color: var(--accent-blue);
          color: var(--accent-blue);
          transform: translateY(-1px);
        }

        :global(.invoice-detail-view) {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        :global(.items-table-header) {
          display: grid;
          grid-template-columns: 2fr 0.5fr 1fr 1fr;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          font-family: var(--font-display);
          font-size: 10px;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        :global(.items-table-body) {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        :global(.item-detail-row) {
          display: grid;
          grid-template-columns: 2fr 0.5fr 1fr 1fr;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
          border-left: 2px solid transparent;
          transition: all 0.2s ease;
          align-items: center;
        }

        :global(.item-detail-row):hover {
          background: rgba(255, 255, 255, 0.04);
          border-left-color: var(--accent-blue);
        }

        :global(.item-name-col) {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        :global(.item-name-col .name) {
          font-weight: 700;
          color: var(--text-primary);
          font-size: 14px;
        }

        :global(.discount-tag) {
          font-size: 10px;
          color: #10b981;
          font-weight: 700;
          background: rgba(16, 185, 129, 0.1);
          padding: 1px 6px;
          border-radius: 4px;
          width: fit-content;
        }

        :global(.item-qty-col) {
          font-weight: 800;
          color: var(--text-secondary);
        }

        :global(.item-price-col) {
          font-weight: 600;
          color: var(--text-secondary);
        }

        :global(.item-total-col) {
          font-weight: 700;
          color: var(--accent-blue);
        }

        :global(.invoice-summary-details) {
          margin-top: 1rem;
          padding: 1.5rem;
          background: linear-gradient(to right, rgba(255, 255, 255, 0.03), transparent);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        :global(.summary-row) {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: var(--text-secondary);
        }

        :global(.summary-row.discount) {
          color: #10b981;
        }

        :global(.summary-row.grand-total) {
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px dotted rgba(255, 255, 255, 0.1);
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 900;
          color: var(--text-primary);
        }

        :global(.summary-row.deposit) {
          font-size: 14px;
          color: var(--accent-blue);
          font-weight: 700;
        }

        :global(.text-center) { text-align: center; }
        :global(.text-right) { text-align: right; }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        :global(.alert-badge-count) {
          background: rgba(var(--accent-red-rgb, 220, 38, 38), 0.1);
          color: var(--accent-red);
          padding: 0.25rem 0.6rem;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 800;
          opacity: 0.5;
        }

        :global(.alert-badge-count.active) {
          opacity: 1;
          background: var(--accent-red);
          color: white;
          box-shadow: 0 0 10px rgba(220, 38, 38, 0.4);
        }

        :global(.alerts-list) {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        :global(.alert-item) {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-tech);
          transition: all 0.3s ease;
        }

        :global(.alert-item.warning) {
          border-left: 3px solid #fbbf24;
        }

        :global(.alert-item.critical) {
          border-left: 3px solid #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        :global(.alert-icon) {
          color: #fbbf24;
        }

        :global(.alert-item.critical .alert-icon) {
          color: #ef4444;
        }

        :global(.alert-info) {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        :global(.alert-name) {
          font-weight: 700;
          font-size: 13px;
          color: var(--text-primary);
        }

        :global(.alert-stock) {
          font-size: 11px;
          color: var(--text-secondary);
        }

        :global(.empty-alerts) {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 2rem;
          color: #10b981;
          opacity: 0.6;
        }

        :global(.history-list) {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        :global(.history-header-row) {
          display: flex;
          padding: 0.75rem 1.5rem;
          font-size: 11px;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        :global(.history-item) {
          display: flex;
          align-items: center;
          padding: 1.25rem 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-tech);
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        :global(.history-item:hover) {
          border-color: var(--accent-blue);
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(4px);
        }

        :global(.history-col-product) { flex: 2; display: flex; flex-direction: column; }
        :global(.history-col-change) { flex: 1; display: flex; flex-direction: column; }
        :global(.history-col-reason) { flex: 2; display: flex; flex-direction: column; }
        :global(.history-col-date) { flex: 1; display: flex; flex-direction: column; align-items: flex-end; }

        :global(.log-product-name) { font-weight: 700; color: var(--text-primary); font-size: 14px; }
        :global(.log-product-id) { font-size: 10px; color: var(--text-secondary); opacity: 0.5; }
        
        :global(.log-amount) { font-weight: 800; font-size: 15px; }
        :global(.log-amount.positive) { color: #10b981; }
        :global(.log-amount.negative) { color: #f43f5e; }
        :global(.log-new-qty) { font-size: 10px; color: var(--text-secondary); }

        :global(.log-reason) { font-weight: 600; font-size: 12px; color: var(--text-primary); }
        :global(.log-note) { font-size: 11px; color: var(--text-secondary); font-style: italic; }

        :global(.history-col-date span:first-child) { font-weight: 600; color: var(--text-primary); font-size: 12px; }
        :global(.history-col-date span:last-child) { font-size: 10px; color: var(--text-secondary); }
      `}</style>
    </div>
  );
};

const AdminLayout = () => {
  return (
    <Suspense fallback={
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Initializing PBT Elite Command...</p>
      </div>
    }>
      <AdminLayoutContent />
    </Suspense>
  );
};

export default AdminLayout;
