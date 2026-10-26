"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Boxes,
  AlertTriangle
} from "lucide-react";
import { DashboardSummaryData, getDashboardSummary } from "../../lib/api/dashboard";
import { updateInvoiceStatus } from "../../lib/api/invoice";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";

const DEFAULT_DASHBOARD_DATA: DashboardSummaryData = {
  summary: {
    totalRevenue: 0,
    totalOrders: 0,
    uniqueCustomers: 0,
    inventoryValue: 0,
    totalInventoryCount: 0,
    averageOrderValue: 0,
  },
  recentInvoices: [],
  lowStockItems: [],
  analytics: {
    trends: [],
    categories: [],
    topProducts: [],
  },
};

export default function DashboardOverview() {
  const { user, isAdmin } = useDashboard();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [data, setData] = useState<DashboardSummaryData>(DEFAULT_DASHBOARD_DATA);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getDashboardSummary();
        if (response.success && response.data) {
          setData(response.data);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="animate-spin w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full"></div>
        <p className="text-slate-400 font-medium">Gathering command data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="bg-red-500/10 border border-red-500 text-red-400 rounded-lg p-4">
          <p className="font-medium">{error}</p>
        </div>
        <button
          className="refresh-btn"
          onClick={() => setRefreshTrigger(prev => prev + 1)}
        >
          <TrendingUp size={14} className="refresh-icon" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const summary = data?.summary;
  const recentInvoices = data?.recentInvoices ?? [];
  const lowStockItems = data?.lowStockItems ?? [];
  const analytics = data?.analytics;

  // Empty state: no products and no invoices
  if (
    !data?.recentInvoices?.length &&
    !data?.lowStockItems?.length &&
    !data?.analytics?.categories?.length
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Package size={48} className="text-slate-500" />
        <p className="text-slate-400 font-medium">No data available yet</p>
      </div>
    );
  }

  // Bar chart data: product quantity by category (Foil, Sabre, Epée)
  const categoryMap: Record<string, string> = {
    foil: "Foil",
    sabre: "Sabre",
    sabreur: "Sabre",
    epee: "Epée",
    "épée": "Epée",
  };
  const barChartData = (analytics?.categories ?? [])
    .map(cat => ({
      name: categoryMap[cat.name?.toLowerCase() ?? ""] ?? cat.name,
      value: cat.value ?? 0,
    }))
    .filter(cat => ["Foil", "Sabre", "Epée"].includes(cat.name));
  const maxBarValue = Math.max(...barChartData.map(c => c.value), 1);

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

  const totalProducts = data?.summary?.totalProducts ?? summary?.totalInventoryCount ?? 0;
  const totalQuantity = data?.summary?.totalQuantity ?? summary?.totalInventoryCount ?? 0;
  const lowStockCount = data?.summary?.lowStockCount ?? lowStockItems.length;

  return (
    <>
      {/* Summary card row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-icon"><Package size={20} /></div>
          <h3 className="stat-title">Total Products</h3>
          <p className="stat-value">{totalProducts.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Boxes size={20} /></div>
          <h3 className="stat-title">Total Quantity</h3>
          <p className="stat-value">{totalQuantity.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <h3 className="stat-title">Low Stock</h3>
          <p className="stat-value">{lowStockCount.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><DollarSign size={20} /></div>
          <h3 className="stat-title">Total Invoice Value</h3>
          <p className="stat-value">EGP {(data?.summary?.inventoryValue ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Revenue"
          value={data?.summary?.totalRevenue ?? 0}
          change={12.5} // Mock trend for now
          icon={DollarSign}
          prefix="EGP "
        />
        <StatCard
          title="Orders"
          value={data?.summary?.totalOrders ?? 0}
          change={8.3}
          icon={ShoppingCart}
        />
        <StatCard
          title="Inventory"
          value={summary?.totalInventoryCount ?? 0}
          change={5.2}
          icon={Package}
        />
        <StatCard
          title="Audience"
          value={summary?.uniqueCustomers ?? 0}
          change={15.7}
          icon={Users}
        />
      </div>

      <div className="dashboard-grid">
        {/* Revenue Performance Area Chart */}
        <div className="chart-card wide-chart">
          <div className="card-header">
            <h2 className="card-title">Revenue Performance</h2>
            <div className="header-actions">
               <button className="refresh-btn" onClick={() => setRefreshTrigger(prev => prev + 1)} title="Update Analytics">
                  <TrendingUp size={14} className="refresh-icon" />
                  <span>Refresh</span>
               </button>
            </div>
          </div>
          <div className="area-chart-container">
            <svg viewBox="0 0 800 200" className="svg-area-chart">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <path
                d={`M 0 200 ${(analytics?.trends ?? []).map((t, i) => {
                  const trends = analytics?.trends ?? [];
                  const maxRev = Math.max(...trends.map(d => d.revenue ?? 0), 1);
                  const x = (i / (trends.length - 1)) * 800;
                  const y = 200 - ((t.revenue ?? 0) / maxRev) * 150;
                  return `L ${x} ${y}`;
                }).join(' ')} L 800 200 Z`}
                fill="url(#areaGradient)"
              />
              <path
                d={(analytics?.trends ?? []).map((t, i) => {
                  const trends = analytics?.trends ?? [];
                  const maxRev = Math.max(...trends.map(d => d.revenue ?? 0), 1);
                  const x = (i / (trends.length - 1)) * 800;
                  const y = 200 - ((t.revenue ?? 0) / maxRev) * 150;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="var(--accent-blue)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="chart-labels">
              <span>{new Date(analytics?.trends?.[0]?.date ?? "").toLocaleDateString()}</span>
              <span>{analytics?.trends?.[(analytics?.trends?.length ?? 1) - 1]?.date}</span>
            </div>
          </div>
        </div>

        {/* Category Distribution Donut */}
        <div className="list-card donut-card">
          <div className="card-header"><h2 className="card-title">Sales by Category</h2></div>
          <div className="donut-container">
            <svg viewBox="0 0 200 200" className="svg-donut">
              {(analytics?.categories ?? []).map((cat, i) => {
                const categories = analytics?.categories ?? [];
                const total = categories.reduce((sum, c) => sum + (c.value ?? 0), 0);
                const startAngle = (categories.slice(0, i).reduce((sum, c) => sum + (c.value ?? 0), 0) / (total || 1)) * 360;
                const angle = ((cat.value ?? 0) / (total || 1)) * 360;
                const x1 = 100 + 70 * Math.cos((startAngle - 90) * Math.PI / 180);
                const y1 = 100 + 70 * Math.sin((startAngle - 90) * Math.PI / 180);
                const x2 = 100 + 70 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
                const y2 = 100 + 70 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
                return (
                  <path key={cat.name} d={`M ${x1} ${y1} A 70 70 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2}`} fill="none" stroke={['#3b82f6', '#fbbf24', '#f472b6', '#10b981'][i % 4]} strokeWidth="15" strokeLinecap="round" />
                );
              })}
              <circle cx="100" cy="100" r="50" fill="var(--bg-deep)" />
              <text x="100" y="105" textAnchor="middle" className="donut-center-text" fill="var(--text-primary)" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {(analytics?.categories?.length ?? 0)} CATS
              </text>
            </svg>
            <div className="donut-legend">
              {(analytics?.categories ?? []).map((cat, i) => {
                const categories = analytics?.categories ?? [];
                const total = categories.reduce((sum, c) => sum + (c.value ?? 0), 0);
                const percentage = Math.round(((cat.value ?? 0) / (total || 1)) * 100);
                return (
                  <div key={cat.name} className="legend-item">
                    <span className="legend-dot" style={{ background: ['#3b82f6', '#fbbf24', '#f472b6', '#10b981'][i % 4] }}></span>
                    <span className="legend-name">{cat.name}</span>
                    <span className="legend-per">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="list-card">
          <div className="card-header">
            <h2 className="card-title">Low Stock Alerts</h2>
            <div className={`alert-badge-count ${lowStockItems.length > 0 ? 'active' : ''}`}>{lowStockItems.length} Items</div>
          </div>
          <div className="alerts-list">
            {lowStockItems.length === 0 ? (
              <div className="empty-alerts"><CheckCircle size={32} /><p>All healthy</p></div>
            ) : (
              lowStockItems.slice(0, 5).map(product => (
                <div key={product.id} className={`alert-item ${product.quantity === 0 ? 'critical' : 'warning'}`}>
                  <AlertCircle size={14} className="alert-icon" />
                  <div className="alert-info"><span className="alert-name">{product.name}</span><span className="alert-stock">{product.quantity} left</span></div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="list-card">
          <div className="card-header"><h2 className="card-title">Recent Invoices</h2></div>
          <div className="invoice-list">
            {recentInvoices.map((invoice) => (
              <div key={invoice._id || invoice.invoiceId} className={`invoice-item status-${invoice.status}`}>
                <div className="invoice-id-col"><div className="invoice-id">{invoice.invoiceId}</div><div className="invoice-customer">{invoice.customer}</div></div>
                <div className="invoice-amount-col"><div className="invoice-amount">{(invoice.amount ?? 0).toLocaleString()} EGP</div><div className="invoice-date">{invoice.date}</div></div>
              </div>
            ))}
          </div>
          <button className="view-all-btn" onClick={() => router.push("/invoices")}>View All Invoices</button>
        </div>
      </div>

      {/* Product Quantity by Category — pure CSS bar chart */}
      {barChartData.length > 0 && (
        <div className="chart-card">
          <div className="card-header"><h2 className="card-title">Product Quantity by Category</h2></div>
          <div className="h-48 flex items-end justify-around gap-6 px-4">
            {barChartData.map(cat => (
              <div key={cat.name} className="flex flex-col items-center justify-end h-full flex-1">
                <span className="text-slate-300 text-sm font-medium mb-2">{cat.value.toLocaleString()}</span>
                <div
                  className="w-full max-w-[64px] bg-blue-500 rounded-t"
                  style={{ height: `${Math.max((cat.value / maxBarValue) * 100, 4 / 1.92)}%`, minHeight: "4px" }}
                ></div>
                <span className="text-slate-400 text-xs mt-2">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Selling Products */}
      <div className="chart-card">
        <div className="card-header"><h2 className="card-title">Top Selling Products</h2></div>
        <div className="products-leaderboard">
          {(analytics?.topProducts ?? []).map((product, idx) => {
            const topProducts = analytics?.topProducts ?? [];
            const maxRev = Math.max(...topProducts.map(p => p.revenue ?? 0), 1);
            const progressWidth = ((product.revenue ?? 0) / maxRev) * 100;
            return (
              <div key={idx} className="leaderboard-item">
                <div className="item-rank">#{idx + 1}</div>
                <div className="item-details">
                  <div className="item-header"><div className="item-name">{product.name}</div><div className="item-revenue">{(product.revenue ?? 0).toLocaleString()} EGP</div></div>
                  <div className="progress-container"><div className="progress-bar" style={{ width: `${progressWidth}%` }}><div className="progress-glow"></div></div></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
