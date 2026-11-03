import { NextRequest, NextResponse } from "next/server";
import { getUserCollection } from "../../lib/mongoDB";
import { verifyAccessToken } from "../../lib/auth/token";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyAccessToken(accessToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Authorization
    const userCollection = await getUserCollection();
    const currentUser = await userCollection.findOne({
      _id: new ObjectId(payload.userId),
    });

    if (!currentUser || !Array.isArray(currentUser.roles) || !currentUser.roles.includes("admin")) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Query
    const search = request.nextUrl.searchParams.get("search");
    const filter = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Fetch
    const users = await userCollection
      .find(filter)
      .project({ password: 0, sessions: 0 })
      .toArray();

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("❌ Error in GET /api/users:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
