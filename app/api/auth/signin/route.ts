import { NextRequest, NextResponse } from "next/server";
import { db, users, blacklistTokens } from "../../../lib/db";
import { verifyPassword } from "../../../lib/auth/password";
import { generateToken } from "../../../lib/auth/token";
import { and, eq, gt, or } from "drizzle-orm";

// In-memory store for failed login attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes in milliseconds

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user is locked out
    const attemptData = failedAttempts.get(email.toLowerCase());
    if (attemptData && attemptData.count >= MAX_ATTEMPTS) {
      const timeElapsed = Date.now() - attemptData.lastAttempt;
      if (timeElapsed < LOCKOUT_TIME) {
        const minutesLeft = Math.ceil((LOCKOUT_TIME - timeElapsed) / (60 * 1000));
        return NextResponse.json(
          { error: `Too many failed attempts. Please try again in ${minutesLeft} minutes.` },
          { status: 429 }
        );
      } else {
        // Reset attempts if lockout time has passed
        failedAttempts.delete(email.toLowerCase());
      }
    }

    // Check if the access token (if provided) is blacklisted
    const accessToken = request.cookies.get("access_token")?.value;
    if (accessToken) {
      const blacklisted = await db
        .select()
        .from(blacklistTokens)
        .where(and(eq(blacklistTokens.token, accessToken), gt(blacklistTokens.expiresAt, new Date())));
      if (blacklisted.length > 0) {
        return NextResponse.json(
          { error: "Session has been revoked. Please sign in again." },
          { status: 401 }
        );
      }
    }

    // Find user by email or username
    const rows = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, email)));
    const user = rows[0];

    if (!user) {
      // Record failed attempt
      const attempts = failedAttempts.get(email.toLowerCase()) || { count: 0, lastAttempt: 0 };
      failedAttempts.set(email.toLowerCase(), {
        count: attempts.count + 1,
        lastAttempt: Date.now()
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is not activated. Please check your email for setup instructions." },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      // Record failed attempt
      const attempts = failedAttempts.get(email.toLowerCase()) || { count: 0, lastAttempt: 0 };
      failedAttempts.set(email.toLowerCase(), {
        count: attempts.count + 1,
        lastAttempt: Date.now()
      });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Clear failed attempts on successful login
    failedAttempts.delete(email.toLowerCase());

    // Generate tokens
    const token = await generateToken(user.id);

    // Update last login and session
    const session = {
      createdAt: new Date(),
      userAgent: request.headers.get("user-agent") || "unknown",
    };
    const currentSessions = Array.isArray(user.sessions) ? user.sessions : [];
    await db
      .update(users)
      .set({
        lastLogin: new Date(),
        sessions: [...currentSessions, session],
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create response
    const response = NextResponse.json(
      {
        message: "Sign in successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        },
      },
      { status: 200 }
    );

    // Set cookies
    response.cookies.set("access_token", token.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    response.cookies.set("refresh_token", token.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    response.cookies.set("ROLES", JSON.stringify(user.roles || []), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    response.cookies.set("logged_in", "true", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Sign in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
