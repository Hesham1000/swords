import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "../../../lib/db";
import { eq } from "drizzle-orm";
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

    const rows = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        roles: schema.users.roles,
      })
      .from(schema.users)
      .where(eq(schema.users.id, payload.userId))
      .limit(1);
    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
