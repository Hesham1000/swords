import { NextRequest, NextResponse } from "next/server";
import {
  decodePasswordSetupToken,
  generateToken,
} from "../../../lib/auth/token";
import { db } from "../../../lib/db";
import { users } from "../../../lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../../lib/auth/password";
import { v4 as uuidv4 } from "uuid";
import { validatePassword } from "../../../utils/validation";
import ApiError from "../../../utils/ApiError";

export async function POST(req: NextRequest) {
  try {
    const {
      password,
      confirmPassword,
      token: passwordToken,
    } = await req.json();

    if (!passwordToken) {
      throw ApiError.unauthorized("Missing password setup token");
    }

    // Decode token to get email
    const email = await decodePasswordSetupToken(passwordToken);
    if (!email) {
      throw ApiError.unauthorized("Invalid or expired token");
    }

    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRows[0];
    if (!user) {
      throw ApiError.notFound("User is not found");
    }

    const userId = user.id;

    // ✅ Validate password
    const validationError = validatePassword(
      password,
      user.firstName ?? "",
      user.email ?? "",
      ""
    );
    if (validationError) {
      throw ApiError.badRequest(validationError);
    }

    if (password !== confirmPassword) {
      throw ApiError.badRequest("Passwords do not match");
    }

    const hashedPassword = await hashPassword(password.trim());

    await db
      .update(users)
      .set({
        password: hashedPassword,
        isActive: true,
        updatedAt: new Date(),
        lastLogin: new Date(),
      })
      .where(eq(users.id, userId));

    // Generate new auth tokens
    const { accessToken, refreshToken } = await generateToken(userId);

    const now = new Date();
    // Create new session
    const newSession = {
      session_id: uuidv4(),
      token: accessToken,
      refresh: refreshToken,
      last_action: now,
    };

    // Add session to user
    const existingSessions = Array.isArray(user.sessions)
      ? (user.sessions as Array<Record<string, unknown>>)
      : [];
    await db
      .update(users)
      .set({ sessions: [...existingSessions, newSession] })
      .where(eq(users.id, userId));

    const res = NextResponse.json(
      {
        message: "Password set successfully, you are now logged in.",
      },
      { status: 200 }
    );

    res.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    res.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 6, // 6 hours for access token
      path: "/",
    });

    res.cookies.set("ROLES", JSON.stringify(user.roles ?? []), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 6, // 6 hours
    });


    return res;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          statusCode: error.statusCode,
        },
        { status: error.statusCode }
      );
    }
    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
