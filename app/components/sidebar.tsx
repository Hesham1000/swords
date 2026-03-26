"use client";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { motion } from "framer-motion";

interface SidebarProps {
  currentPage: string;
  onNavigation: (page: string) => void;
  sidebarOpen: boolean;
  onLogoutSuccess?: () => void; // Optional callback after successful logout
}

const Sidebar = ({
  currentPage,
  onNavigation,
  sidebarOpen,
  onLogoutSuccess,
}: SidebarProps) => {
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      // Note: User asked for default light, so we only auto-dark if they specifically set it or if Windows is dark.
      // But for "default light", we can just check if savedTheme is dark.
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

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Products", icon: Package },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "wallet", label: "Wallet", icon: Wallet },
  ];

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL;
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

      const data = await response.json();
      console.log("Logout successful:", data);

      // Call the success callback if provided
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }

      router.push("/");

      // Optional: Redirect to login page or home page
      // window.location.href = '/login';
    } catch (error) {
      console.error("Logout error:", error);
      // Handle error (show toast, alert, etc.)
      alert("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? "mobile-open" : "closed"}`}>
      <motion.div
        className="sidebar-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
      >
        <motion.div
          className="sidebar-brand"
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
          animate={{ textShadow: ["0 0 0px var(--accent-blue)", "0 0 8px var(--accent-blue)", "0 0 0px var(--accent-blue)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <img src="/icon.svg" alt="Kings Logo" width="32" height="32" />
          <motion.span
            animate={{ backgroundPosition: ["0%", "200%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            style={{
              background: "linear-gradient(90deg, var(--text-primary), var(--accent-blue), var(--text-primary))",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            KINGS
          </motion.span>
        </motion.div>
      </motion.div>

      <nav className="sidebar-nav">
        {navItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ x: 5, backgroundColor: "var(--glass-bg)" }}
            whileTap={{ scale: 0.95 }}
            className={`nav-item ${currentPage === item.id ? "active" : ""}`}
            onClick={() => onNavigation(item.id)}
          >
            <motion.div
              animate={currentPage === item.id ? {
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{ duration: 0.5 }}
            >
              <item.icon size={20} />
            </motion.div>
            <span>{item.label}</span>
          </motion.div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">A</div>
          <div className="user-details">
            <div className="user-name">Admin User</div>
            <div className="user-role">Administrator</div>
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
