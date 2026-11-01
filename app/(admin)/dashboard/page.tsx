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
  CheckCircle 
} from "lucide-react";
import { DashboardSummaryData } from "../../lib/api/dashboard";
import { updateInvoiceStatus } from "../../lib/api/invoice";
import { useRouter } from "next/navigation";
import { useDashboard } from "../layout";

export default function DashboardOverview() {
  const { user, isAdmin, dashboardData, refreshDashboard, selectedPeriod, refreshDashboardWithPeriod } = useDashboard();
  const [periodLoading, setPeriodLoading] = useState(false);

  const handlePeriodChange = async (period: "today" | "week" | "month") => {
    setPeriodLoading(true);
    await refreshDashboardWithPeriod(period);
    setPeriodLoading(false);
  };
  const router = useRouter();
  const [error, setError] = useState("");

  if (!dashboardData && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-slate-400 font-medium">Gathering command data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  const { summary, recentInvoices, lowStockItems, analytics } = dashboardData!;

  const calculateTrend = (values: number[]): number => {
    if (values.length < 2) return 0;
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const firstSum = firstHalf.reduce((a, b) => a + b, 0);
    const secondSum = secondHalf.reduce((a, b) => a + b, 0);
    if (firstSum === 0) return secondSum > 0 ? 100 : 0;
    return ((secondSum - firstSum) / firstSum) * 100;
  };

  const revenueTrend = calculateTrend(analytics.trends.map(t => t.revenue));
  const ordersTrend = calculateTrend(analytics.trends.map(t => t.orders));
  const inventoryTrend = 0;
  const audienceTrend = 0;

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
<div className="period-filter">
        <button
          className={`period-btn ${selectedPeriod === "today" ? "active" : ""}`}
          onClick={() => handlePeriodChange("today")}
          disabled={periodLoading}
        >
          Today
        </button>
        <button
          className={`period-btn ${selectedPeriod === "week" ? "active" : ""}`}
          onClick={() => handlePeriodChange("week")}
          disabled={periodLoading}
        >
          Week
        </button>
        <button
          className={`period-btn ${selectedPeriod === "month" ? "active" : ""}`}
          onClick={() => handlePeriodChange("month")}
          disabled={periodLoading}
        >
          Month
        </button>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Revenue"
          value={summary.totalRevenue}
          change={revenueTrend}
          icon={DollarSign}
          prefix="EGP "
        />
        <StatCard
          title="Orders"
          value={summary.totalOrders}
          change={ordersTrend}
          icon={ShoppingCart}
        />
        <StatCard
          title="Inventory"
          value={summary.totalInventoryCount}
          change={inventoryTrend}
          icon={Package}
        />
        <StatCard
          title="Audience"
          value={summary.uniqueCustomers}
          change={audienceTrend}
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
                d={`M 0 200 ${analytics.trends.map((t, i) => {
                  const maxRev = Math.max(...analytics.trends.map(d => d.revenue), 1);
                  const x = (i / (analytics.trends.length - 1)) * 800;
                  const y = 200 - (t.revenue / maxRev) * 150;
                  return `L ${x} ${y}`;
                }).join(' ')} L 800 200 Z`}
                fill="url(#areaGradient)"
              />
              <path
                d={analytics.trends.map((t, i) => {
                  const maxRev = Math.max(...analytics.trends.map(d => d.revenue), 1);
                  const x = (i / (analytics.trends.length - 1)) * 800;
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
              <span>{analytics.trends[0]?.date}</span>
              <span>{analytics.trends[analytics.trends.length-1]?.date}</span>
            </div>
          </div>
        </div>

        {/* Category Distribution Donut */}
        <div className="list-card donut-card">
          <div className="card-header"><h2 className="card-title">Sales by Category</h2></div>
          <div className="donut-container">
            <svg viewBox="0 0 200 200" className="svg-donut">
              {analytics.categories.map((cat, i) => {
                const total = analytics.categories.reduce((sum, c) => sum + c.value, 0);
                const startAngle = (analytics.categories.slice(0, i).reduce((sum, c) => sum + c.value, 0) / (total || 1)) * 360;
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
                {analytics.categories.length} CATS
              </text>
            </svg>
            <div className="donut-legend">
              {analytics.categories.map((cat, i) => {
                const total = analytics.categories.reduce((sum, c) => sum + c.value, 0);
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
          <div className="card-header"><h2 className="card-title">Recent Invoices</h2></div>
          <div className="invoice-list">
            {recentInvoices.map((invoice) => (
              <div key={invoice._id || invoice.invoiceId} className={`invoice-item status-${invoice.status}`}>
                <div className="invoice-id-col"><div className="invoice-id">{invoice.invoiceId}</div><div className="invoice-customer">{invoice.customer}</div></div>
                <div className="invoice-amount-col"><div className="invoice-amount">{invoice.amount.toLocaleString()} EGP</div><div className="invoice-date">{invoice.date}</div></div>
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
          {analytics.topProducts.map((product, idx) => {
            const maxRev = Math.max(...analytics.topProducts.map(p => p.revenue), 1);
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
