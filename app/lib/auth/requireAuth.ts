import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { verifyAccessTokenEdge } from "./edge";
import { getUserCollection } from "../mongoDB";

/**
 * Verifies the access_token cookie and loads the corresponding user.
 * Returns { user } on success or { error } with a 401 response otherwise.
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: any } | { error: NextResponse }> {
  try {
    const token = request.cookies.get("access_token")?.value;
    if (!token) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const payload = await verifyAccessTokenEdge(token);
    if (!payload) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const usersCollection = await getUserCollection();
    const user = await usersCollection.findOne(
      { _id: new ObjectId(payload.userId) },
      { projection: { password: 0, sessions: 0 } }
    );

    if (!user) {
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    return { user };
  } catch (error) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

/**
 * Same as requireAuth but additionally requires the 'admin' role.
 * Returns { error } with a 403 response when the user is not an admin.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: any } | { error: NextResponse }> {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const roles = (auth.user as any).roles;
  if (!Array.isArray(roles) || !roles.includes("admin")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}
