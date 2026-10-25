import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import ApiError from "../../../utils/ApiError";

// In-memory token blacklist: token -> expiresAt
const tokenBlacklist = new Map<string, number>();

// Periodically purge expired entries so the map doesn't grow unbounded
function purgeExpiredTokens() {
  const now = Date.now();
  for (const [token, expiresAt] of tokenBlacklist.entries()) {
    if (expiresAt <= now) {
      tokenBlacklist.delete(token);
    }
  }
}

/**
 * API route to handle logout
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;

    // Blacklist the token in memory until its natural expiry (6h access token)
    if (token) {
      purgeExpiredTokens();
      tokenBlacklist.set(token, Date.now() + 6 * 60 * 60 * 1000);
    }

    const response = NextResponse.json({
      message: "Logout successful",
      status: 200,
      success: true,
    });

    // Clear ALL cookies by setting them to expire immediately
    const allCookies = cookieStore.getAll();

    for (const cookie of allCookies) {
      response.cookies.set(cookie.name, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(0), // Set to past date to delete
        maxAge: 0, // Also set maxAge to 0 for immediate deletion
      });
    }

    // Also clear common auth-related cookies explicitly to ensure deletion
    const authCookies = [
      "access_token",
      "refresh_token",
      "logged_in",
    ];

    for (const cookieName of authCookies) {
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(0),
        maxAge: 0,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
        },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
