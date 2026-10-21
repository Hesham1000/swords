"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Root route-level error boundary.
 * Catches rendering errors in any route segment below app/ and offers a retry.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6"
      style={{ background: "var(--bg-deep)", color: "var(--text-primary)" }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "rgba(var(--accent-red-rgb), 0.1)",
          color: "var(--accent-red)",
        }}
      >
        <AlertTriangle size={32} aria-hidden="true" />
      </div>

      <div className="max-w-md text-center">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Something went wrong
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          An unexpected error occurred. Try again — if the problem persists,
          please contact support.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            Error reference: {error.digest}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          background: "var(--grad-btn)",
          color: "var(--bg-deep)",
          boxShadow: "0 10px 20px -5px rgba(var(--accent-blue-rgb), 0.4)",
        }}
      >
        <RotateCcw size={16} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
