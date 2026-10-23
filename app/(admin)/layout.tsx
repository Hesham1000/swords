"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { Menu, X, Loader2, ChevronDown, User as UserIcon, LogOut } from "lucide-react";
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
  const fetchedRef = useRef(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Close user dropdown on outside click or Escape
  useEffect(() => {
    if (!userMenuOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userMenuOpen]);

  const handleTopbarLogout = async () => {
    setUserMenuOpen(false);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      router.push("/");
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
          </h2>
          <div className="topbar-user" ref={userMenuRef}>
            <button
              className="topbar-user-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span className="topbar-user-avatar">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </span>
              <span className="topbar-user-name">
                {user?.username || "Guest"}
              </span>
              <ChevronDown
                size={16}
                style={{
                  transform: userMenuOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {userMenuOpen && (
              <motion.div
                className="topbar-dropdown"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                role="menu"
              >
                <div className="dropdown-header">
                  <div className="dropdown-user-name">
                    {user?.username || "Guest"}
                  </div>
                  <div className="dropdown-user-role">
                    {!!user?.roles?.includes("admin") ? "Administrator" : "User"}
                  </div>
                </div>
                <a
                  className="dropdown-item"
                  href="/dashboard"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <UserIcon size={16} />
                  <span>Profile</span>
                </a>
                <button
                  className="dropdown-item dropdown-item-danger"
                  role="menuitem"
                  onClick={handleTopbarLogout}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </motion.div>
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
          max-width: 1600px;
          width: 100%;
          margin: 0 auto;
        }
        .topbar-user {
          position: relative;
          display: flex;
          align-items: center;
        }
        .topbar-user-btn {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          background: var(--glass-bg);
          border: 1px solid var(--border-tech);
          border-radius: 10px;
          padding: 0.375rem 0.75rem 0.375rem 0.375rem;
          color: var(--text-primary);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.2s;
          max-width: 100%;
        }
        .topbar-user-btn:hover {
          background: rgba(var(--accent-blue-rgb), 0.08);
          border-color: rgba(var(--accent-blue-rgb), 0.2);
        }
        .topbar-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--grad-amber, var(--accent-blue));
          color: #fff;
          font-weight: 800;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .topbar-user-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }
        .topbar-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          min-width: 200px;
          background: var(--bg-card);
          border: 1px solid var(--border-tech);
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
          padding: 0.5rem;
          z-index: 50;
          overflow: hidden;
        }
        .dropdown-header {
          padding: 0.625rem 0.75rem;
          border-bottom: 1px solid var(--border-tech);
          margin-bottom: 0.375rem;
        }
        .dropdown-user-name {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-primary);
        }
        .dropdown-user-role {
          font-size: 0.75rem;
          color: var(--accent-blue);
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: none;
          border-radius: 8px;
          background: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.15s;
          text-align: left;
        }
        .dropdown-item:hover {
          background: rgba(var(--accent-blue-rgb), 0.08);
          color: var(--accent-blue);
        }
        .dropdown-item-danger:hover {
          background: rgba(220, 38, 38, 0.12);
          color: #ef4444;
        }
        @media (max-width: 640px) {
          .topbar {
            padding: 0 1rem;
          }
          .topbar-user-name {
            display: none;
          }
          .topbar-dropdown {
            right: -0.5rem;
            min-width: 180px;
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
