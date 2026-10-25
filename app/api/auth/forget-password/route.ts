import { NextRequest, NextResponse } from "next/server";
import { db, users } from "../../../lib/db";
import { sendPasswordResetEmail } from "../../../lib/email";
import { generatePasswordSetupToken } from "../../../lib/auth/token";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const rows = await db.select().from(users).where(eq(users.email, email));
    const user = rows[0];

    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json(
        { message: "If an account with that email exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is not activated. Please check your email for setup instructions." },
        { status: 403 }
      );
    }

    // Check if user uses default GitHub credentials (no password reset needed)
    if (user.useDefaultGithub) {
      return NextResponse.json(
        { error: "This account uses default credentials. Please contact an administrator." },
        { status: 400 }
      );
    }

    // Rate limit: prevent resending reset email within 60 seconds
    if (user.lastEmailSent) {
      const timeSinceLastEmail = Date.now() - new Date(user.lastEmailSent).getTime();
      if (timeSinceLastEmail < 60 * 1000) {
        return NextResponse.json(
          { error: "Please wait before requesting another reset email" },
          { status: 429 }
        );
      }
    }

    // Generate reset token and send email
    const resetToken = await generatePasswordSetupToken(email);
    await sendPasswordResetEmail(email, user.username, resetToken);

    // Update lastEmailSent
    await db
      .update(users)
      .set({ lastEmailSent: new Date(), updatedAt: new Date() })
      .where(eq(users.email, email));

    return NextResponse.json(
      { message: "If an account with that email exists, a reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forget password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
