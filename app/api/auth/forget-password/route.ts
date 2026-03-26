import { NextRequest, NextResponse } from "next/server";
import {
  generatePasswordSetupToken,
  PASSWORD_TOKEN_EXPIRATION_MINUTES,
} from "../../../lib/auth/token";
import { getUserCollection } from "../../../lib/mongoDB";
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

    const userCollection = await getUserCollection();
    const existingUser = await userCollection.findOne({ email });

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

    // Check if this is a personal GitHub account (useDefaultGithub: false means personal GitHub account)
    if (existingUser.useDefaultGithub === false) {
      const errorUrl = buildErrorUrl({
        message:
          "This account uses GitHub authentication. Please sign in with GitHub or set up a password through your profile settings.",
        type: "auth",
        source: "github-auth",
      });
      return NextResponse.json(
        {
          error: "GitHub account detected",
          message:
            "This account uses GitHub authentication. Please sign in with GitHub.",
          redirectUrl: errorUrl,
          statusCode: 400,
        },
        { status: 400 }
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
    await userCollection.updateOne(
      { _id: existingUser._id },
      { $set: { lastEmailSent: now } }
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
