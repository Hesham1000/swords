import { NextRequest, NextResponse } from "next/server";
import { db, users } from "../../../lib/db";
import { sendPasswordSetupEmail } from "../../../lib/email";
import { generatePasswordSetupToken } from "../../../lib/auth/token";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { email, username } = await request.json();

    if (!email || !username) {
      return NextResponse.json(
        { error: "Email and username are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters (letters, numbers, underscores only)" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingRows = await db.select().from(users).where(eq(users.email, email));
    const existingUser = existingRows[0];

    if (existingUser) {
      // Rate limit: prevent resending setup email within 60 seconds
      if (existingUser.lastEmailSent) {
        const timeSinceLastEmail = Date.now() - new Date(existingUser.lastEmailSent).getTime();
        if (timeSinceLastEmail < 60 * 1000) {
          return NextResponse.json(
            { error: "Please wait before requesting another setup email" },
            { status: 429 }
          );
        }
      }

      // Resend setup email for existing inactive user
      if (!existingUser.isActive) {
        const setupToken = await generatePasswordSetupToken(email);
        await sendPasswordSetupEmail(email, username, setupToken);

        await db
          .update(users)
          .set({ lastEmailSent: new Date(), updatedAt: new Date() })
          .where(eq(users.email, email));

        return NextResponse.json(
          { message: "Setup email resent. Please check your inbox." },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Check if username is taken
    const usernameRows = await db.select().from(users).where(eq(users.username, username));
    if (usernameRows[0]) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Create new user (inactive until password is set)
    const inserted = await db
      .insert(users)
      .values({
        email,
        username,
        password: "", // Will be set via setup link
        roles: ["user"],
        isActive: false,
        dateJoined: new Date(),
        lastEmailSent: new Date(),
      })
      .returning();

    const newUser = inserted[0];

    // Generate setup token and send email
    const setupToken = await generatePasswordSetupToken(email);
    await sendPasswordSetupEmail(email, username, setupToken);

    return NextResponse.json(
      {
        message: "User created. Please check your email to set up your password.",
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
