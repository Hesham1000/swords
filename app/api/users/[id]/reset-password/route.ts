import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUserCollection } from "../../../../lib/mongoDB";
import {
  verifyAccessToken,
  generatePasswordSetupToken,
  PASSWORD_TOKEN_EXPIRATION_MINUTES,
} from "../../../../lib/auth/token";
import { sendEmailSetPassword } from "../../../../utils/email";

export async function POST(
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

    if (
      !currentUser ||
      !Array.isArray(currentUser.roles) ||
      !currentUser.roles.includes("admin")
    ) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch target user
    const { id } = await params;
    const targetUser = await userCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Generate password setup token
    const token = await generatePasswordSetupToken(targetUser.email);

    // Save token to user document
    await userCollection.updateOne(
      { _id: targetUser._id },
      { $set: { passwordSetupToken: token, lastEmailSent: new Date() } }
    );

    // Send reset email
    const link = `${process.env.REDIRECT_URL}/set-password?type=reset&token=${encodeURIComponent(token)}`;
    await sendEmailSetPassword(
      targetUser.email,
      targetUser.username,
      link,
      PASSWORD_TOKEN_EXPIRATION_MINUTES
    );

    return NextResponse.json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send password reset email" },
      { status: 500 }
    );
  }
}
