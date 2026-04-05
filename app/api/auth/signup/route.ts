import { NextRequest, NextResponse } from "next/server";
import { getUserCollection } from "../../../lib/mongoDB";
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

    const userCollection = await getUserCollection();

    // Check existing user
    const existingUser = await userCollection.findOne({ email });

    if (existingUser) {
      if (!existingUser.isActive) {
        throw ApiError.badRequest(
          "You are already registered. Please go to your email and set your password"
        );
      }
      // Check if last email was sent < 1 min ago
      const lastEmailSent = existingUser.lastEmailSent;
      const now = new Date();

      if (lastEmailSent) {
        const timeDiff = now.getTime() - new Date(lastEmailSent).getTime();
        if (timeDiff < 60000) {
          throw ApiError.badRequest("Please check your email inbox");
        }
      }

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

    // Create new user with roles array
    const newUser = {
      username: username,
      email,
      isActive: false,
      roles: ["user"], // 👈 roles array instead of single role
      sessions: [],
      dateJoined: new Date(),
      lastEmailSent: new Date(),
    };

    await userCollection.insertOne(newUser);

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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
