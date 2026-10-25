"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  FileText,
  LogOut,
  Loader2,
  Sun,
  Moon,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

interface SidebarProps {
  currentPage: string;
  onNavigation: (page: string) => void;
  sidebarOpen: boolean;
  onLogoutSuccess?: () => void; // Optional callback after successful logout
  user?: any; // Added user prop
}

const Sidebar = ({
  currentPage,
  onNavigation,
  sidebarOpen,
  onLogoutSuccess,
  user,
}: SidebarProps) => {
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      if (savedTheme === "dark") {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark-mode");
      }
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark-mode");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      localStorage.setItem("theme", "light");
    }
  };

  const isAdmin = user?.roles?.includes("admin");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
    { id: "products", label: "Products", icon: Package, adminOnly: false },
    { id: "invoices", label: "Invoices", icon: FileText, adminOnly: true },
    { id: "wallet", label: "Wallet", icon: Wallet, adminOnly: true },
    { id: "history", label: "History", icon: TrendingUp, adminOnly: true },
  ].filter(item => !item.adminOnly || isAdmin);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const baseUrl =
        ""
      const response = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies if using session-based auth
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status: ${response.status}`);
      }

      if (onLogoutSuccess) {
        onLogoutSuccess();
      }

      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : 'closed'}`}>
      <style jsx global>{`
        .sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          background: var(--glass-bg, var(--card-bg, #ffffff));
          border-right: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
          padding: 24px 16px;
          gap: 8px;
          height: 100vh;
          position: sticky;
          top: 0;
          flex-shrink: 0;
        }

        /* Mobile: fixed drawer, hidden by default */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            box-shadow: 0 0 24px rgba(0, 0, 0, 0.2);
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 0 20px;
          border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
          margin-bottom: 8px;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-brand img {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          object-fit: cover;
        }

        .sidebar-brand-text {
          font-family: var(--font-display, inherit);
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-color, inherit);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 10px;
          border-left: 3px solid transparent;
          color: var(--text-color, inherit);
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.2s ease,
            border-color 0.2s ease;
        }

        .nav-item:hover {
          background: var(--glass-bg, rgba(0, 0, 0, 0.04));
          transform: translateX(4px);
        }

        .nav-item.active {
          border-left: 3px solid var(--accent-blue, #3b82f6);
          background: color-mix(
            in srgb,
            var(--accent-blue, #3b82f6) 10%,
            transparent
          );
          font-weight: 600;
        }

        .nav-item:focus-visible {
          outline: 2px solid var(--accent-blue, #3b82f6);
          outline-offset: 2px;
        }

        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
        }
      `}</style>
      <motion.div
        className="sidebar-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="sidebar-brand">
          <img src="/icon.png" alt="Kings Logo" width={40} height={40} />
          <span className="sidebar-brand-text">KINGS</span>
        </div>
      </motion.div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map((item, index) => {
          const href = item.id === "dashboard" ? "/dashboard" : `/${item.id}`;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={href}
                className={`nav-item ${currentPage === item.id ? "active" : ""}`}
                aria-current={currentPage === item.id ? "page" : undefined}
                onClick={() => onNavigation(item.id)}
              >
                <item.icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || "U"}</div>
          <div className="user-details">
            <div className="user-name">{user?.username || "Guest"}</div>
            <div className="user-role">
              {isAdmin ? "Administrator" : "User"}
            </div>
          </div>
        </div>

        <div className="theme-toggle-container">
          <button
            className="theme-btn"
            onClick={toggleTheme}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        <button
          className="logout-btn"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <LogOut size={18} />
          )}
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
