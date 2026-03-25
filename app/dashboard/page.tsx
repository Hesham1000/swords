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
} from "lucide-react";
import Sidebar from "../components/sidebar";
import ProductForm from "../components/productform";
import ProductsList from "../components/products-list";
import { getProducts, deleteProduct, Product } from "../lib/api/product";
import { getInvoices, createInvoice, updateInvoiceStatus, Invoice } from "../lib/api/invoice";
import { getWalletBalance, getWalletTransactions, WalletTransaction } from "../lib/api/wallet";
import InvoiceForm from "../components/invoice-form";
import WalletDepositForm from "../components/wallet-deposit-form";
import ShipmentForm from "../components/shipment-form";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const AdminLayoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showProductForm, setShowProductForm] = useState(false);
  const [refreshProducts, setRefreshProducts] = useState(false);
  const tab = searchParams.get("tab");
  const currentPage = (tab && ["dashboard", "products", "invoices", "wallet"].includes(tab)) ? tab : "dashboard";
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPagination, setProductsPagination] = useState<any>(null);
  const [totalInventory, setTotalInventory] = useState(0);

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
  const [refreshInvoices, setRefreshInvoices] = useState(false);

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



  const handleNavigation = (page: string) => {
    setLoading(true);
    router.push(`/dashboard?tab=${page}`);
    setTimeout(() => setLoading(false), 500);
  };

  // Fetch products and invoices for dashboard, or specific data for tabs
  useEffect(() => {
    if (currentPage === "dashboard") {
      fetchProducts();
      fetchInvoices();
    } else if (currentPage === "products") {
      fetchProducts(productsPage);
    } else if (currentPage === "invoices") {
      fetchInvoices();
    } else if (currentPage === "wallet") {
      fetchWalletData();
    }
  }, [currentPage, refreshProducts, refreshInvoices, refreshWallet, productsPage, searchQuery, filterCategory, filterType, filterBrand]);

  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    setInvoicesError("");
    try {
      const response = await getInvoices();
      setInvoices(response.data);
    } catch (error: any) {
      setInvoicesError(error.message || "Failed to load invoices");
      console.error("Error fetching invoices:", error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const fetchWalletData = async () => {
    setWalletLoading(true);
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
    setProductsLoading(true);
    setProductsError("");

    try {
      const isDashboard = currentPage === "dashboard";
      const response = await getProducts(page, 8, isDashboard, {
        search: searchQuery,
        category: filterCategory,
        productType: filterType,
        brand: filterBrand
      });
      setProducts(response.data);
      setProductsPagination(response.pagination);
      
      if (isDashboard && response.summary) {
        setTotalInventory(response.summary.totalQuantity);
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
    try {
      setLoading(true);
      await updateInvoiceStatus(id, "paid");
      setRefreshInvoices(!refreshInvoices);
      setRefreshWallet(!refreshWallet);
    } catch (error: any) {
      console.error("Failed to mark invoice as paid:", error);
      alert(error.message || "Failed to update status");
    } finally {
      setLoading(false);
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
      setLoading(true);
      await updateInvoiceStatus(id, undefined, numAmount);
      setRefreshInvoices(!refreshInvoices);
      setRefreshWallet(!refreshWallet);
    } catch (error: any) {
      console.error("Failed to add deposit:", error);
      alert(error.message || "Failed to add deposit");
    } finally {
      setLoading(false);
    }
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
        <div className="chart-card">
          <div className="card-header">
            <h2 className="card-title">Revenue Trend</h2>
          </div>
          <div className="chart-container-wrapper">
            <div className="chart-grid-lines">
              <span></span><span></span><span></span><span></span>
            </div>
            <div className="chart-container">
              <div className="bar-chart">
                {monthlySales.map((data, idx) => {
                  const maxRevenue = Math.max(
                    ...monthlySales.map((d) => d.revenue)
                  );
                  const height = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={idx} className="bar-item">
                      <div className="bar" style={{ height: `${height}%` }}>
                        <div className="bar-glow"></div>
                        <span className="bar-tooltip">
                          EGP {(data.revenue).toLocaleString()}
                        </span>
                      </div>
                      <span className="bar-label">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
                      className="mark-paid-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsPaid(invoice._id!);
                      }}
                      title="Mark as Paid"
                    >
                      <CheckCircle size={14} />
                      Paid
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
        onDelete={handleDeleteProduct}
        onEdit={handleEditProduct}
        pagination={productsPagination}
        onPageChange={(page) => {
          setProductsPage(page);
          fetchProducts(page);
        }}
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
        <h1 className="page-title">Invoices Management</h1>
        <button 
          className="primary-btn"
          onClick={() => setShowInvoiceForm(true)}
        >
          <Plus size={20} />
          Create Invoice
        </button>
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
                  <span className={`status-badge status-${invoice.status}`}>
                    {invoice.status === "overdue" && <AlertCircle size={14} />}
                    {invoice.status}
                  </span>
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
                  <h2 className="modal-title">Create New Invoice</h2>
                  <button
                    className="close-modal-btn"
                    onClick={() => setShowInvoiceForm(false)}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <InvoiceForm
                    onClose={() => setShowInvoiceForm(false)}
                    onSuccess={() => {
                      setRefreshInvoices(!refreshInvoices);
                      setShowInvoiceForm(false);
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
        return DashboardContent();
      case "products":
        return ProductsContent();
      case "invoices":
        return InvoicesContent();
      case "wallet":
        return WalletContent();
      default:
        return DashboardContent();
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

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
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
