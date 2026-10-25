import { NextRequest, NextResponse } from "next/server";
import { db, users } from "../../../lib/db";
import { verifyAccessToken } from "../../../lib/auth/token";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(accessToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        roles: users.roles,
      })
      .from(users)
      .where(eq(users.id, payload.userId));

    const user = rows[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          roles: user.roles,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
