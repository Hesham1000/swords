import { NextRequest, NextResponse } from "next/server";
import { getUserCollection } from "../../../lib/mongoDB";
import { verifyAccessToken } from "../../../lib/auth/token";
import { ObjectId } from "mongodb";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Parse body
    const body = await request.json();
    const { roles, isActive } = body;

    // Validation
    if (roles !== undefined) {
      if (!Array.isArray(roles)) {
        return NextResponse.json(
          { success: false, error: "roles must be an array" },
          { status: 400 }
        );
      }
      const isValidRoles =
        (roles.length === 1 && roles[0] === "admin") ||
        (roles.length === 1 && roles[0] === "user");
      if (!isValidRoles) {
        return NextResponse.json(
          { success: false, error: "roles must be [\"admin\"] or [\"user\"]" },
          { status: 400 }
        );
      }
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    // Safety check: prevent an admin from removing their own admin role
    const { id } = await params;
    if (roles !== undefined && !roles.includes("admin") && id === payload.userId) {
      return NextResponse.json(
        { success: false, error: "Cannot remove your own admin role" },
        { status: 400 }
      );
    }

    // Database update — only include provided fields
    const setFields: Record<string, unknown> = {};
    if (roles !== undefined) setFields.roles = roles;
    if (isActive !== undefined) setFields.isActive = isActive;

    const result = await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: setFields }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "User updated" });
  } catch (error) {
    console.error("❌ Error in PATCH /api/users/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Safety check: prevent deleting your own account
    const { id } = await params;
    if (id === payload.userId) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Database delete
    const result = await userCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("❌ Error in DELETE /api/users/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
