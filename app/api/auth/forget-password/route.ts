import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  generatePasswordSetupToken,
  PASSWORD_TOKEN_EXPIRATION_MINUTES,
} from "../../../lib/auth/token";
import { db } from "../../../lib/db";
import { users } from "../../../lib/db/schema";
import { sendEmailSetPassword } from "../../../utils/email";
import ApiError from "../../../utils/ApiError";
import { buildErrorUrl } from "../../../lib/errors/error-builder";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email.trim();

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

    // Check if user account is inactive (registration not completed)
    if (!existingUser.isActive) {
      throw ApiError.badRequest(
        "Your account registration is incomplete. We have sent you a password setup link during registration. Please check your email or contact support for assistance."
      );
    }

    // Prevent too frequent email sending
    const now = new Date();
    if (existingUser.lastEmailSent) {
      const timeDiff =
        now.getTime() - new Date(existingUser.lastEmailSent).getTime();
      if (timeDiff < 60000) {
        console.warn("Password reset email sent too recently", {
          email,
          secondsRemaining: Math.ceil((60000 - timeDiff) / 1000),
        });
        throw ApiError.tooManyRequests(
          "Please wait before requesting another reset link."
        );
      }
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

    // Save lastEmailSent
    await db
      .update(users)
      .set({ lastEmailSent: now })
      .where(eq(users.id, existingUser.id));

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

    console.error("Forget password error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", statusCode: 500 },
      { status: 500 }
    );
  }
}
