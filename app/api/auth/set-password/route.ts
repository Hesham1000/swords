import { NextRequest, NextResponse } from "next/server";
import { db, users } from "../../../lib/db";
import { decodePasswordSetupToken, generateToken } from "../../../lib/auth/token";
import { validatePassword, hashPassword } from "../../../lib/auth/password";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Decode the setup token to get the email
    const email = await decodePasswordSetupToken(token);
    if (!email) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const rows = await db.select().from(users).where(eq(users.email, email));
    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Validate password strength
    const validation = validatePassword(password, user.firstName || undefined);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors.join(". ") },
        { status: 400 }
      );
    }

    // Hash and save the new password
    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        isActive: true,
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    // Generate tokens and create session
    const tokens = await generateToken(user.id);

    const session = {
      createdAt: new Date(),
      userAgent: req.headers.get("user-agent") || "unknown",
    };
    const currentSessions = Array.isArray(user.sessions) ? user.sessions : [];
    await db
      .update(users)
      .set({ sessions: [...currentSessions, session] })
      .where(eq(users.id, user.id));

    // Create response
    const response = NextResponse.json(
      {
        message: "Password set successfully",
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
    response.cookies.set("access_token", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    response.cookies.set("refresh_token", tokens.refreshToken, {
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
    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
