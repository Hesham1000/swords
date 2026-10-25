import { NextRequest, NextResponse } from "next/server";
import { db, blacklistTokens } from "../../../lib/db";
import { revokeAndDeleteToken } from "../../../lib/auth/token";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // Revoke and delete the refresh token if present
    if (refreshToken) {
      try {
        await revokeAndDeleteToken(refreshToken);
      } catch (err) {
        console.error("Failed to revoke refresh token:", err);
      }
    }

    // Blacklist the access token so it can't be reused before expiry
    if (token) {
      try {
        // Access tokens are short-lived; blacklist for 1 hour to cover remaining validity
        await db.insert(blacklistTokens).values({
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });
      } catch (err) {
        console.error("Failed to blacklist access token:", err);
      }
    }

    // Create response and clear cookies
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("ROLES", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    response.cookies.set("logged_in", "", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
