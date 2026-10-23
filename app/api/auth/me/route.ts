import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../lib/db";
import { users } from "../../../lib/db/schema";
import { verifyAccessToken } from "../../../lib/auth/token";

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(accessToken);

    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Map to the expected JSON response format (exclude sensitive fields)
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles || ["user"],
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
