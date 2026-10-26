"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertCircle, 
  CheckCircle 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";

type StatCardProps = {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  prefix?: string;
};

function StatCard({ title, value, change, icon: Icon, prefix = "" }: StatCardProps) {
  return (
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
}

export default function DashboardOverview() {
  const { dashboardData, dashboardError, refreshDashboard } = useDashboard();
  const router = useRouter();
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  if (!dashboardData && !dashboardError) {
    return (
      <div className="stats-grid">
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="error-banner">
        <span>{dashboardError}</span>
        <button onClick={refreshDashboard}>Retry</button>
      </div>
    );
  }

  const { summary, recentInvoices, lowStockItems, analytics } = dashboardData ?? {};
  const recentInvoicesSafe = recentInvoices ?? [];
  const lowStockItemsSafe = lowStockItems ?? [];
  const analyticsSafe = {
    trends: analytics?.trends ?? [],
    categories: analytics?.categories ?? [],
    topProducts: analytics?.topProducts ?? [],
  };

  const sortedInvoices = [...recentInvoicesSafe].sort((a, b) => {
    const aTime = new Date(a.date || a.createdAt || 0).getTime();
    const bTime = new Date(b.date || b.createdAt || 0).getTime();
    return sortDir === "desc" ? bTime - aTime : aTime - bTime;
  });

  if (summary?.totalOrders === 0 && recentInvoicesSafe.length === 0) {
    return (
      <div className="empty-state-container">
        <Package className="empty-state-icon" />
        <h2 className="empty-state-title">No orders yet</h2>
        <p className="empty-state-description">When you create your first invoice, it will show up here.</p>
        <button
          className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          onClick={() => router.push("/invoices")}
        >
          Create your first invoice
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="stats-grid">
        <StatCard
          title="Revenue"
          value={summary?.totalRevenue ?? 0}
          change={12.5} // Mock trend for now
          icon={DollarSign}
          prefix="EGP "
        />
        <StatCard
          title="Orders"
          value={summary?.totalOrders ?? 0}
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
               <button className="refresh-btn" onClick={refreshDashboard} title="Update Analytics">
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
                d={analyticsSafe.trends.length < 2 ? "" : `M 0 200 ${analyticsSafe.trends.map((t, i) => {
                  const maxRev = Math.max(...analyticsSafe.trends.map(d => d.revenue), 1);
                  const x = (i / (analyticsSafe.trends.length - 1 || 1)) * 800;
                  const y = 200 - (t.revenue / maxRev) * 150;
                  return `L ${x} ${y}`;
                }).join(' ')} L 800 200 Z`}
                fill="url(#areaGradient)"
              />
              <path
                d={analyticsSafe.trends.length < 2 ? "" : analyticsSafe.trends.map((t, i) => {
                  const maxRev = Math.max(...analyticsSafe.trends.map(d => d.revenue), 1);
                  const x = (i / (analyticsSafe.trends.length - 1 || 1)) * 800;
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
              <span>{analyticsSafe.trends[0]?.date}</span>
              <span>{analyticsSafe.trends[analyticsSafe.trends.length-1]?.date}</span>
            </div>
          </div>
        </div>

        {/* Category Distribution Donut */}
        <div className="list-card donut-card">
          <div className="card-header"><h2 className="card-title">Sales by Category</h2></div>
          <div className="donut-container">
            <svg viewBox="0 0 200 200" className="svg-donut">
              {analyticsSafe.categories.map((cat, i) => {
                const total = analyticsSafe.categories.reduce((sum, c) => sum + c.value, 0);
                const startAngle = (analyticsSafe.categories.slice(0, i).reduce((sum, c) => sum + c.value, 0) / (total || 1)) * 360;
                const angle = (cat.value / (total || 1)) * 360;
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
                {analyticsSafe.categories.length} CATS
              </text>
            </svg>
            <div className="donut-legend">
              {analyticsSafe.categories.map((cat, i) => {
                const total = analyticsSafe.categories.reduce((sum, c) => sum + c.value, 0);
                const percentage = Math.round((cat.value / (total || 1)) * 100);
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
            <div className={`alert-badge-count ${lowStockItemsSafe.length > 0 ? 'active' : ''}`}>{lowStockItemsSafe.length} Items</div>
          </div>
          <div className="alerts-list">
            {lowStockItemsSafe.length === 0 ? (
              <div className="empty-alerts"><CheckCircle size={32} /><p>All healthy</p></div>
            ) : (
              lowStockItemsSafe.slice(0, 5).map(product => (
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
          <div className="card-header">
            <h2 className="card-title">Recent Invoices</h2>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "desc" | "asc")}
              className="border border-slate-600 rounded-md px-2 py-1 text-sm bg-transparent text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Sort invoices"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
          <div className="invoice-list">
            {sortedInvoices.map((invoice) => (
              <div key={invoice._id || invoice.invoiceId} className={`invoice-item status-${invoice.status}`}>
                <div className="invoice-id-col"><div className="invoice-id">{invoice.invoiceId}</div><div className="invoice-customer">{invoice.customer}</div></div>
                <div className="invoice-amount-col"><div className="invoice-amount">{parseFloat(String(invoice.amount ?? 0)).toLocaleString()} EGP</div><div className="invoice-date">{invoice.date}</div></div>
              </div>
            ))}
          </div>
          <button className="view-all-btn" onClick={() => router.push("/invoices")}>View All Invoices</button>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="chart-card">
        <div className="card-header"><h2 className="card-title">Top Selling Products</h2></div>
        <div className="products-leaderboard">
          {analyticsSafe.topProducts.map((product, idx) => {
            const maxRev = Math.max(...analyticsSafe.topProducts.map(p => p.revenue), 1);
            const progressWidth = (product.revenue / maxRev) * 100;
            return (
              <div key={idx} className="leaderboard-item">
                <div className="item-rank">#{idx + 1}</div>
                <div className="item-details">
                  <div className="item-header"><div className="item-name">{product.name}</div><div className="item-revenue">{product.revenue.toLocaleString()} EGP</div></div>
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
