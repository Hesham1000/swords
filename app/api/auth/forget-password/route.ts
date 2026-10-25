import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  generatePasswordSetupToken,
  PASSWORD_TOKEN_EXPIRATION_MINUTES,
} from "../../../lib/auth/token";
import { db, users } from "../../../lib/db";
import { sendEmailSetPassword } from "../../../utils/email";
import ApiError from "../../../utils/ApiError";
import { buildErrorUrl } from "../../../lib/errors/error-builder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received forget-password request for email:", body.email);
    const email = body.email.trim();
    console.log("Processed email:", email);

    if (!email) {
      throw ApiError.badRequest("Email is required");
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser) {
      // For security, don't reveal whether user exists
      throw ApiError.badRequest("This email does not exist");
    }

    // Generate reset token
    const token = await generatePasswordSetupToken(email);
    const resetLink = `${
      process.env.REDIRECT_URL
    }/set-password?token=${encodeURIComponent(token)}`;

    // Send email
    await sendEmailSetPassword(
      email,
      existingUser.username,
      resetLink,
      PASSWORD_TOKEN_EXPIRATION_MINUTES
    );

    return NextResponse.json(
      { message: "A reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          statusCode: error.statusCode,
        },
        { status: error.statusCode }
      );
    }
    console.error("Forget-password error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", statusCode: 500 },
      { status: 500 }
    );
  }
}
