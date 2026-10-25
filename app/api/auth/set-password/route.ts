import { NextRequest, NextResponse } from "next/server";
import {
  decodePasswordSetupToken,
  generateToken,
} from "../../../lib/auth/token";
import { db, schema } from "../../../lib/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../../lib/auth/password";
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

    const userRows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    const user = userRows[0];
    if (!user) {
      throw ApiError.notFound("User is not found");
    }

    const userId = user.id;

    // ✅ Validate password
    const validationError = validatePassword(
      password,
      user.username,
      user.email,
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
      .update(schema.users)
      .set({
        password: hashedPassword,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));

    // Generate new auth tokens
    const { accessToken, refreshToken } = await generateToken(userId);

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

    res.cookies.set("ROLES", JSON.stringify(user.roles || ["user"]), {
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
