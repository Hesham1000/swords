"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { Menu, X, Loader2, ChevronDown, LogOut } from "lucide-react";
import Sidebar from "../components/sidebar";
import { getCurrentUser, User } from "../lib/api/auth";
import { getDashboardSummary, DashboardSummaryData } from "../lib/api/dashboard";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import "./dashboard.css";

interface DashboardContextType {
  user: User | null;
  isAdmin: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  dashboardData: DashboardSummaryData | null;
  refreshDashboard: () => void;
}

const DashboardContext = React.createContext<DashboardContextType | null>(null);

export const useDashboard = () => {
  const context = React.useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within DashboardProvider");
  return context;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardSummaryData | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(false);

  // Close user dropdown on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [userMenuOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Check for mobile on mount and window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const refreshDashboard = () => {
    fetchedRef.current = false;
    setRefreshTrigger(prev => prev + 1);
  };

  const contextValue = React.useMemo(() => ({
    user,
    isAdmin: !!user?.roles?.includes("admin"),
    sidebarOpen,
    setSidebarOpen,
    dashboardData,
    refreshDashboard
  }), [user, sidebarOpen, dashboardData]);

  // Fetch current user
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const initDashboard = async () => {
      try {
        setLoading(true);
        // Fetch User and Dashboard Summary together
        const [userData, summaryRes] = await Promise.all([
          getCurrentUser(),
          getDashboardSummary()
        ]);
        
        if (userData) setUser(userData.user);
        if (summaryRes.success) setDashboardData(summaryRes.data);
      } catch (error) {
        console.error("Dashboard Initialization Error:", error);
      } finally {
        setLoading(false);
      }
    };
    initDashboard();
  }, [refreshTrigger]);

  // Handle Redirection for non-admins
  useEffect(() => {
    if (loading) return;

    const isAdmin = !!user?.roles?.includes("admin");
    const adminOnlyRoutes = ["/dashboard", "/invoices", "/wallet", "/history"];
    
    // If user is not admin and is on an admin-only route (exact match or starts with)
    const isProtected = adminOnlyRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    );

    if (!isAdmin && isProtected) {
      console.log("Unauthorized access to admin route, redirecting to products...");
      router.replace("/products");
    }
  }, [user, loading, pathname, router]);

  const currentPage = pathname.split("/").pop() || "dashboard";

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Initializing KINGS...</p>
        <style jsx>{`
          .dashboard-loading {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #0f172a;
            color: white;
            gap: 1.5rem;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e5e7eb;
            border-top-color: #7c2d3a;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Overlay for Mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        currentPage={currentPage}
        onNavigation={() => {
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
            {pathname === "/dashboard" && "Dashboard Overview"}
            {pathname.includes("/products") && "Products Management"}
            {pathname.includes("/invoices") && "Invoices Management"}
            {pathname.includes("/wallet") && "Wallet Management"}
            {pathname.includes("/history") && "Inventory History"}
            {!["/dashboard", "/products", "/invoices", "/wallet", "/history"].some((route) =>
              pathname.includes(route)
            ) && "Dashboard"}
          </h2>
          <div className="user-menu" ref={userMenuRef}>
            <button
              className="user-menu-trigger"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="User account menu"
            >
              <span className="user-avatar">
                {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
              </span>
              <span className="user-name">{user?.username || "User"}</span>
              <ChevronDown
                size={16}
                className={`user-menu-chevron ${userMenuOpen ? "open" : ""}`}
              />
            </button>
            {userMenuOpen && (
              <div className="user-dropdown" role="menu">
                {user?.email && (
                  <div className="user-dropdown-email" role="menuitem">
                    {user.email}
                  </div>
                )}
                <button
                  className="user-dropdown-logout"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="content-wrapper">
          <Suspense fallback={
            <div className="dashboard-loading">
              <Loader2 className="animate-spin" size={32} />
              <p>Loading module...</p>
            </div>
          }>
            <DashboardContext.Provider value={contextValue}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </DashboardContext.Provider>
          </Suspense>
        </div>
      </main>

      <style jsx global>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: var(--bg-deep, #020617);
        }
        .main-content {
          flex: 1;
          margin-left: 280px;
          transition: margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 0;
          display: flex;
          flex-direction: column;
        }
        .main-content.expanded {
          margin-left: 0;
        }
        .topbar {
          height: 70px;
          background: var(--bg-card);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-tech);
          display: flex;
          align-items: center;
          padding: 0 2rem;
          position: sticky;
          top: 0;
          z-index: 40;
          justify-content: space-between;
        }
        .topbar-title {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: var(--grad-amber);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .menu-toggle {
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--glass-bg);
          border: 1px solid var(--border-tech);
          transition: all 0.2s;
        }
        .menu-toggle:hover {
          background: rgba(var(--accent-blue-rgb), 0.08);
          border-color: rgba(var(--accent-blue-rgb), 0.2);
        }
        .content-wrapper {
          padding: 2rem;
          max-width: 1920px;
          width: 100%;
          margin: 0 auto;
        }
        .user-menu {
          position: relative;
        }
        .user-menu-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: 1px solid transparent;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          color: var(--text-primary);
          transition: all 0.2s;
        }
        .user-menu-trigger:hover {
          background: var(--glass-bg);
          border-color: var(--border-tech);
        }
        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--grad-amber);
          color: #0f172a;
          font-weight: 800;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-menu-chevron {
          transition: transform 0.2s;
        }
        .user-menu-chevron.open {
          transform: rotate(180deg);
        }
        .user-dropdown {
          position: absolute;
          right: 0;
          top: calc(100% + 0.5rem);
          background: #ffffff;
          border: 1px solid var(--border-tech);
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15);
          z-index: 50;
          min-width: 180px;
          overflow: hidden;
        }
        .user-dropdown-email {
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          color: #475569;
          border-bottom: 1px solid var(--border-tech);
          word-break: break-all;
        }
        .user-dropdown-logout {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0f172a;
          transition: background 0.2s;
        }
        .user-dropdown-logout:hover {
          background: #f1f5f9;
        }
        @media (max-width: 640px) {
          .content-wrapper {
            padding: 1rem;
          }
          .topbar {
            padding: 0 1rem;
          }
          .topbar-title {
            font-size: 1rem;
          }
        }
        .sidebar-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 45;
        }
        @media (max-width: 1024px) {
          .main-content {
            margin-left: 0;
          }
          .sidebar-overlay.visible {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
