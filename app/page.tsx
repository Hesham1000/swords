// app/page.tsx - Premium KINGS Landing Page
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Zap,
  Shield,
  Wallet,
  LayoutDashboard,
  Package,
  TrendingUp,
  Globe
} from "lucide-react";
import "./globals.css";

const KingsLogo = () => (
  <div className="hero-nav-kings" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <img src="/icon.svg" alt="Kings Logo" width="40" height="40" />
    <motion.div
      className="sidebar-brand"
      style={{ fontSize: "24px", fontWeight: 900 }}
      animate={{ textShadow: ["0 0 0px var(--accent-blue)", "0 0 8px var(--accent-blue)", "0 0 0px var(--accent-blue)"] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
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
  </div>
);

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { scrollYProgress } = useScroll();
  const yRange = useTransform(scrollYProgress, [0, 1], [0, -100]);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    const hasToken = cookies.some((c) => c.trim().startsWith("logged_in="));
    setIsAuthenticated(hasToken);
  }, []);

  const features = [
    { title: "Smart Dashboard", description: "Real-time analytics and inventory tracking for elite fencers.", icon: LayoutDashboard },
    { title: "Secure Wallet", description: "Seamless EGP, USD, and EUR transactions for global trade.", icon: Wallet },
    { title: "Premium Gear", description: "Only the highest standard FIE certified equipment.", icon: Shield },
    { title: "Global Network", description: "Connecting academies and athletes across the world.", icon: Globe },
  ];

  const categories = [
    { 
      name: "PBT", 
      image: "/images/fencing_mask.png", 
      description: "Hungarian excellence known for unparalleled durability and classic competitive designs."
    },
    { 
      name: "Allstar", 
      image: "/images/fencing_epee.png", 
      description: "The choice of champions. High-performance German engineering for the world's elite."
    },
    { 
      name: "Uhlmann", 
      image: "/images/fencing_glove.png", 
      description: "Precision and reliability. Premium FIE-certified gear for serious competitors."
    },
  ];

  return (
    <div className="fencing-landing">
      <KingsLogo />

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-bg-container">
          <img
            src="/images/fencing_hero.png"
            alt="Fencing Duel"
            className="hero-bg-image"
          />
          <div className="hero-overlay-gradient" style={{ background: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, var(--bg-deep) 100%)' }}></div>
        </div>

        <div className="landing-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="hero-content-box"
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="section-tag"
            >
              EQUIPPING THE ELITE
            </motion.span>
            <h1 className="hero-main-title">
              THE ULTIMATE <br />
              <span className="glow-text">ARSENAL</span>
            </h1>
            <p className="hero-description" style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              Direct access to **PBT**, **Allstar**, and **Uhlmann**. The premier marketplace and command center for the global fencing community. 
              Manage your gear, track your performance, and dominate the strip.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href={isAuthenticated ? "/dashboard" : "/sign-in"} style={{ textDecoration: 'none' }}>
                <button className="primary-btn" style={{ margin: "0 auto", padding: "1.5rem 3rem", fontSize: "1.1rem", textDecoration: 'none' }}>
                  {isAuthenticated ? "PROCEED TO DASHBOARD" : "JOIN To Kings"}
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Arsenal Section */}
      <section className="landing-section">
        <div className="landing-container">
          <span className="section-tag">THE ARSENAL</span>
          <h2 className="section-title">PREMIUM SELECTION</h2>

          <div className="arsenal-grid">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="arsenal-card"
              >
                <div style={{ position: 'relative', height: '200px', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                  <img src={cat.image} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}></div>
                  <div style={{ position: 'absolute', bottom: '1rem', left: '1rem' }}>
                  </div>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '0.5rem' }}>{cat.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{cat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="landing-section" style={{ padding: '4rem 0', borderTop: '1px solid var(--border-tech)' }}>
        <div className="landing-container" style={{ textAlign: 'center' }}>
          <KingsLogo />
          <p style={{ marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '14px' }}>
            © 2026 KINGS Fencing Marketplace. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

