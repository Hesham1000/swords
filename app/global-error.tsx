"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Global error boundary — last-resort handler for errors thrown in the root
 * layout itself. Must render its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "var(--bg-deep, #f8fafc)",
          color: "var(--text-primary, #0f172a)",
          fontFamily: "var(--font-sans, sans-serif)",
          margin: 0,
        }}
      >
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-6 p-6"
        >
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "rgba(var(--accent-red-rgb, 239, 68, 68), 0.1)",
              color: "var(--accent-red, #ef4444)",
            }}
          >
            <AlertTriangle size={32} aria-hidden="true" />
          </div>

          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary, #64748b)" }}>
              A critical error occurred. Try again — if the problem persists,
              please contact support.
            </p>
            {error.digest ? (
              <p className="mt-2 text-xs" style={{ color: "var(--text-secondary, #64748b)" }}>
                Error reference: {error.digest}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: "var(--grad-btn, #2563eb)",
              color: "#fff",
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
