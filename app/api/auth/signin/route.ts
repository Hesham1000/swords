import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "../../../lib/auth/password";
import { generateToken } from "../../../lib/auth/token";
import { v4 as uuidv4 } from "uuid";
import { getUserCollection } from "../../../lib/mongoDB";
import ApiError from "../../../utils/ApiError";

// Failed login attempts tracking
const failedAttempts: {
  [identifier: string]: { attempts: number; lockoutTime?: Date };
} = {};
const LOCKOUT_PERIOD = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 3;

// Helper function to check if input is email
function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Sanitize data from raw body early
    const identifier = body.email.trim();
    const password = body.password?.trim();

    if (!identifier || !password) {
      throw ApiError.badRequest("Email/Username and password are required!");
    }

    const userCollection = await getUserCollection();

    // Find user by either email or username
    let user;
    if (isEmail(identifier)) {
      // Search by email
      user = await userCollection.findOne({ email: identifier });
    } else {
      // Search by username
      user = await userCollection.findOne({ username: identifier });
    }

    // If not found with email, also check username for email input (fallback)
    if (!user && isEmail(identifier)) {
      user = await userCollection.findOne({ email: identifier });
    }

    if (!user) {
      // Determine whether the identifier was an email or username for error message
      const identifierType = isEmail(identifier) ? "email" : "username";
      throw ApiError.badRequest(`Incorrect ${identifierType} or password!`);
    }

    // Use email for lockout tracking (consistent identifier)
    const lockoutKey = user.email;

    if (user) {
      if (!user.roles?.includes("admin")) {
        throw ApiError.badRequest("You do not have permission to sign in here");
      } else if (!user.isActive) {
        throw ApiError.badRequest(
          "You do not complete the registration process. Please check your email to set your password"
        );
      }

      // 🔒 Lockout handling
      if (failedAttempts[lockoutKey]) {
        const lockoutTime = failedAttempts[lockoutKey].lockoutTime;
        if (lockoutTime) {
          const remaining =
            LOCKOUT_PERIOD - (Date.now() - lockoutTime.getTime());
          if (remaining > 0) {
            throw ApiError.badRequest(
              "Account locked out for " +
                Math.ceil(remaining / 60000) +
                " minutes"
            );
          } else {
            // Reset lockout
            failedAttempts[lockoutKey].attempts = 0;
            delete failedAttempts[lockoutKey].lockoutTime;
          }
        }
      }

      // 🔑 Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        // Track failed attempt
        if (!failedAttempts[lockoutKey]) {
          failedAttempts[lockoutKey] = { attempts: 1 };
        } else {
          failedAttempts[lockoutKey].attempts++;
        }

        // Lock account if max attempts exceeded
        if (failedAttempts[lockoutKey].attempts > MAX_FAILED_ATTEMPTS) {
          failedAttempts[lockoutKey].lockoutTime = new Date();
          throw ApiError.badRequest(
            "Account locked out for " + LOCKOUT_PERIOD / 60000 + " minutes"
          );
        }

        throw ApiError.badRequest("Incorrect email/username or password!");
      }

      // ✅ Clear failed attempts on successful login
      delete failedAttempts[lockoutKey];
    }

    // Update user login status
    const now = new Date();

    // Generate tokens - adjust this based on your token generation logic
    // You might want to pass user._id instead of "1"
    const { accessToken, refreshToken } = await generateToken(
      user._id.toString()
    );

    // Create new session
    const newSession = {
      session_id: uuidv4(),
      token: accessToken,
      refresh: refreshToken,
      last_action: now,
    };

    // Add session to user
    await userCollection.updateOne(
      { _id: user._id },
      {
        $push: { sessions: newSession as any },
        $set: { lastLogin: now }, // Update last login time
      }
    );

    // Prepare user data (exclude sensitive fields)
    const userData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      roles: user.roles ?? [], // 👈 roles array
      dateJoined: user.dateJoined,
      lastLogin: now,
      isActive: user.isActive,
    };

    // Create response with cookies
    const response = NextResponse.json(
      { message: "Signin successful", data: userData },
      { status: 200 }
    );

    // Set secure HTTP-only cookies
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 6, // 6 hours for access token
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    response.cookies.set("ROLES", JSON.stringify(user.roles || []), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 6, // 6 hours
    });

    // Add a non-httpOnly cookie for the client UI to check login state
    response.cookies.set("logged_in", "true", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 6,
    });

    return response;
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

    // Log unexpected errors for debugging
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}