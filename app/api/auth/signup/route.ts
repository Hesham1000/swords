import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "../../../lib/db";
import {
  validateEmail,
  validateUsername,
} from "../../../utils/validations/auth/validator";
import {
  generatePasswordSetupToken,
  PASSWORD_TOKEN_EXPIRATION_MINUTES,
} from "../../../lib/auth/token";
import { sendEmailSetPassword } from "../../../utils/email";
import ApiError from "../../../utils/ApiError";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Sanitize data from raw body early
    const username = body.username.trim();
    const email = body.email?.trim();

    // Check existing user
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw ApiError.badRequest(
        "This email is already registered. Please login"
      );
    }

    const usernameValidation = validateUsername(username);
    if (usernameValidation) {
      throw ApiError.badRequest(usernameValidation);
    }

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      throw ApiError.badRequest(emailValidation);
    }

    // Create new user with roles array.
    // The password column is NOT NULL; insert an unusable random placeholder
    // (bcrypt compare against it always fails) until the user sets a real
    // password via the set-password flow.
    await db.insert(users).values({
      username: username,
      email,
      password: crypto.randomUUID() + crypto.randomUUID(),
      roles: ["user"], // 👈 roles array instead of single role
    });

    // Send setup email
    const token = await generatePasswordSetupToken(email);
    const setupLink = `${
      process.env.REDIRECT_URL
    }/set-password?type=activate&token=${encodeURIComponent(token)}`;
    try {
      await sendEmailSetPassword(
        email,
        `${username}`,
        setupLink,
        PASSWORD_TOKEN_EXPIRATION_MINUTES
      );
    } catch (emailError) {
      throw ApiError.badRequest("Error sending email: " + emailError);
    }

    return NextResponse.json(
      {
        message: "User created. Please check your email to set your password.",
      },
      { status: 201 }
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

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", statusCode: 500 },
      { status: 500 }
    );
  }
}
