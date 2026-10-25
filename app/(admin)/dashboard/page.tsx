"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle 
} from "lucide-react";
import { DashboardSummaryData } from "../../lib/api/dashboard";
import { updateInvoiceStatus } from "../../lib/api/invoice";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";

export default function DashboardOverview() {
  const { user, isAdmin, dashboardData, refreshDashboard } = useDashboard();
  const router = useRouter();
  const [error, setError] = useState("");
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  const sortedInvoices = useMemo(() => {
    const recentInvoices = dashboardData?.recentInvoices ?? [];
    const getTime = (date: string) => {
      const t = new Date(date).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    const amount = (a: number | undefined) => a ?? 0;
    const sorted = [...recentInvoices];
    switch (sortOption) {
      case "oldest":
        return sorted.sort((a, b) => getTime(a.date) - getTime(b.date));
      case "highest":
        return sorted.sort((a, b) => amount(b.amount) - amount(a.amount));
      case "lowest":
        return sorted.sort((a, b) => amount(a.amount) - amount(b.amount));
      case "newest":
      default:
        return sorted.sort((a, b) => getTime(b.date) - getTime(a.date));
    }
  }, [dashboardData, sortOption]);

  if (!dashboardData && !error) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="stats-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-slate-200 rounded-lg h-32" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-slate-200 rounded-lg h-12" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  const summary = dashboardData?.summary;
  const analytics = dashboardData?.analytics;
  const lowStockItems = dashboardData?.lowStockItems ?? [];
  const recentInvoices = dashboardData?.recentInvoices ?? [];

  // Empty state: no orders and no invoices yet
  if ((summary?.totalOrders ?? 0) === 0 && recentInvoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Package size={48} className="text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-700">No data yet</h2>
        <p className="text-slate-400 text-sm">Get started by creating your first invoice to see dashboard insights.</p>
        <button
          className="px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
          onClick={() => router.push("/invoices")}
        >
          Create your first invoice
        </button>
      </div>
    );
  }

  const trendData = (analytics?.trends ?? []).slice(-7);
  const maxTrendRevenue = Math.max(...trendData.map((t) => t.revenue ?? 0), 1);

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
                d={`M 0 200 ${(analytics?.trends ?? []).map((t, i) => {
                  const trends = analytics?.trends ?? [];
                  const maxRev = Math.max(...trends.map(d => d.revenue ?? 0), 1);
                  const x = (i / Math.max(trends.length - 1, 1)) * 800;
                  const y = 200 - ((t.revenue ?? 0) / maxRev) * 150;
                  return `L ${x} ${y}`;
                }).join(' ')} L 800 200 Z`}
                fill="url(#areaGradient)"
              />
              <path
                d={(analytics?.trends ?? []).map((t, i) => {
                  const trends = analytics?.trends ?? [];
                  const maxRev = Math.max(...trends.map(d => d.revenue ?? 0), 1);
                  const x = (i / Math.max(trends.length - 1, 1)) * 800;
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
              <span>{(analytics?.trends ?? [])[0]?.date}</span>
              <span>{(analytics?.trends ?? []).slice(-1)[0]?.date}</span>
            </div>
          </div>
        </div>

        {/* Last 7 Days Revenue Bar Chart */}
        <div className="chart-card">
          <div className="card-header">
            <h2 className="card-title">Last 7 Days Revenue</h2>
          </div>
          <div className="w-full">
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">No revenue data for the last 7 days</div>
            ) : (
              <svg viewBox="0 0 700 220" className="w-full h-auto" role="img" aria-label="Last 7 days revenue bar chart">
                {trendData.map((t, i) => {
                  const revenue = t.revenue ?? 0;
                  const barWidth = 60;
                  const gap = (700 - barWidth * trendData.length) / (trendData.length + 1);
                  const x = gap + i * (barWidth + gap);
                  const barHeight = (revenue / maxTrendRevenue) * 160;
                  const y = 190 - barHeight;
                  return (
                    <g key={t.date ?? i}>
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barHeight, 2)}
                        fill="#3b82f6"
                        rx={4}
                      />
                      <text
                        x={x + barWidth / 2}
                        y={210}
                        textAnchor="middle"
                        fill="var(--text-secondary, #64748b)"
                        style={{ fontSize: "11px" }}
                      >
                        {t.date}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Category Distribution Donut */}
        <div className="list-card donut-card">
          <div className="card-header"><h2 className="card-title">Sales by Category</h2></div>
          <div className="donut-container">
            <svg viewBox="0 0 200 200" className="svg-donut">
              {(analytics?.categories ?? []).map((cat, i) => {
                const categories = analytics?.categories ?? [];
                const total = categories.reduce((sum, c) => sum + c.value, 0);
                const startAngle = (categories.slice(0, i).reduce((sum, c) => sum + c.value, 0) / (total || 1)) * 360;
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
                {(analytics?.categories ?? []).length} CATS
              </text>
            </svg>
            <div className="donut-legend">
              {(analytics?.categories ?? []).map((cat, i) => {
                const categories = analytics?.categories ?? [];
                const total = categories.reduce((sum, c) => sum + c.value, 0);
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
          <div className="card-header">
            <h2 className="card-title">Recent Invoices</h2>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as "newest" | "oldest" | "highest" | "lowest")}
              className="px-2 py-1 rounded-md border border-slate-300 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Sort invoices"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
          <div className="invoice-list">
            {sortedInvoices.map((invoice) => (
              <div key={invoice._id || invoice.invoiceId} className={`invoice-item status-${invoice.status}`}>
                <div className="invoice-id-col"><div className="invoice-id">{invoice.invoiceId}</div><div className="invoice-customer">{invoice.customer}</div></div>
                <div className="invoice-amount-col"><div className="invoice-amount">{invoice.amount?.toLocaleString()} EGP</div><div className="invoice-date">{invoice.date}</div></div>
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
