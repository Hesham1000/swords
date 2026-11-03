"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, CheckCircle, AlertCircle, Loader2, Trash2, KeyRound, ShieldCheck } from "lucide-react";
import { getUsers, updateUser, deleteUser, resetUserPassword, User } from "../../lib/api/users";
import { useDashboard } from "../layout";

export default function UsersPage() {
  const { isAdmin } = useDashboard();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionMessage, setActionMessage] = useState<{ userId: string; text: string; isError: boolean } | null>(null);
  const [actingUserId, setActingUserId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input (~300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");
          const response = await getUsers(debouncedSearch || undefined);
          setUsers(response.data);
        } catch (err: any) {
        setError(err.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearch]);

  const handleToggleRole = async (user: User) => {
    const newRole = user.roles.includes("admin") ? "user" : "admin";
    setActingUserId(user._id);
    setActionMessage(null);
    try {
      await updateUser(user._id, { roles: [newRole] });
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, roles: [newRole] } : u))
      );
      setActionMessage({ userId: user._id, text: `Role updated to ${newRole}`, isError: false });
    } catch (err: any) {
      setActionMessage({ userId: user._id, text: err.message || "Failed to update role", isError: true });
    } finally {
      setActingUserId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm("Delete user " + user.username + "? This cannot be undone.")) return;
    setActingUserId(user._id);
    setActionMessage(null);
    try {
      await deleteUser(user._id);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      setActionMessage({ userId: user._id, text: `User ${user.username} deleted`, isError: false });
    } catch (err: any) {
      setActionMessage({ userId: user._id, text: err.message || "Failed to delete user", isError: true });
    } finally {
      setActingUserId(null);
    }
  };

  const handleResetPassword = async (user: User) => {
    setActingUserId(user._id);
    setActionMessage(null);
    try {
      await resetUserPassword(user._id);
      setActionMessage({ userId: user._id, text: "Password reset email sent to " + user.email, isError: false });
    } catch (err: any) {
      setActionMessage({ userId: user._id, text: err.message || "Failed to send password reset email", isError: true });
    } finally {
      setActingUserId(null);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="user-list">
          {loading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" />
              <p>Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">No users found.</div>
          ) : (
            users.map((user) => {
              const isAdminUser = user.roles.includes("admin");
              return (
                <div key={user._id} className="user-item">
                  <div className="user-info-col">
                    <div className="user-avatar">{user.username.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="user-name">{user.username}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                  <div className="user-badges-col">
                    <span className={`status-badge ${isAdminUser ? "role-admin" : "role-user"}`}>
                      {isAdminUser ? "admin" : "user"}
                    </span>
                    <span className={`status-badge ${user.isActive ? "status-active" : "status-inactive"}`}>
                      {user.isActive ? "active" : "inactive"}
                    </span>
                  </div>
                  <div className="user-actions-col">
                    <button
                      className="reset-password-btn"
                      disabled={actingUserId === user._id}
                      onClick={() => handleResetPassword(user)}
                    >
                      <KeyRound size={14} />
                      Reset Password
                    </button>
                    <button
                      className="toggle-role-btn"
                      disabled={actingUserId === user._id}
                      onClick={() => handleToggleRole(user)}
                    >
                      <ShieldCheck size={14} />
                      Toggle Role
                    </button>
                    <button
                      className="delete-user-btn"
                      disabled={actingUserId === user._id}
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                  {actionMessage && actionMessage.userId === user._id && (
                    <p className={`action-message ${actionMessage.isError ? "action-error" : "action-success"}`}>
                      {actionMessage.isError ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                      {actionMessage.text}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx>{`
        .user-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .user-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--glass-bg);
          border-radius: 12px;
          border-left: 3px solid transparent;
          transition: all 0.2s ease;
        }
        .user-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .user-info-col {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          min-width: 220px;
        }
        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--accent-gold);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          font-family: var(--font-display);
          flex-shrink: 0;
        }
        .user-name {
          font-weight: 800;
          font-size: 14px;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .user-email {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 600;
          margin-top: 2px;
        }
        .user-badges-col {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .status-badge.role-admin {
          background: rgba(255, 184, 0, 0.1);
          color: var(--accent-gold);
        }
        .status-badge.role-user {
          background: rgba(100, 116, 139, 0.15);
          color: #94a3b8;
        }
        .status-badge.status-active {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
        }
        .status-badge.status-inactive {
          background: rgba(255, 51, 75, 0.1);
          color: #ff334b;
        }
        .user-actions-col {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .reset-password-btn,
        .toggle-role-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
          background: transparent;
        }
        .reset-password-btn {
          color: var(--accent-blue);
          border: 1px solid var(--accent-blue);
        }
        .reset-password-btn:hover {
          background: var(--accent-blue);
          color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 102, 255, 0.35);
        }
        .toggle-role-btn {
          color: var(--accent-gold);
          border: 1px solid var(--accent-gold);
        }
        .toggle-role-btn:hover {
          background: var(--accent-gold);
          color: #000000;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.35);
        }
        .delete-user-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          background: rgba(220, 38, 38, 0.08);
          color: #dc2626;
          border: 1px solid #dc2626;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .delete-user-btn:hover {
          background: #dc2626;
          color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);
        }
        .delete-user-btn:active {
          transform: translateY(0) scale(0.98);
        }
        .reset-password-btn:disabled,
        .toggle-role-btn:disabled,
        .delete-user-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .action-message {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 12px;
          font-weight: 600;
          margin: 0;
        }
        .action-success {
          color: #10b981;
        }
        .action-error {
          color: #ff334b;
        }
      `}</style>
    </div>
  );
}
