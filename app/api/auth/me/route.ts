import { NextRequest, NextResponse } from "next/server";
import { getUserCollection } from "../../../lib/mongoDB";
import { verifyAccessToken } from "../../../lib/auth/token";
import { ObjectId } from "mongodb";

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

    const userCollection = await getUserCollection();
    const user = await userCollection.findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0, sessions: 0 } }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user._id,
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
