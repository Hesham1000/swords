import { SignJWT, jwtVerify } from "jose";
import { eq, sql } from "drizzle-orm";
import { db, users, blacklistTokens } from "../db";
import { verifyAccessTokenEdge as verifyAccessToken } from "./edge";

// export { verifyAccessToken }; // If needed by other non-edge files

// import { JWTPayloadCustom } from "@/types/auth";

export const INACTIVITY_TIMEOUT = 30 * 60; // 30 mins
export const PASSWORD_TOKEN_EXPIRATION_MINUTES = 8; // 8 minutes

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET!
);
const PASSWORD_SECRET = new TextEncoder().encode(process.env.PASSWORD_SECRET!);

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Generate Access + Refresh Tokens
export async function generateToken(
  userId: string,
  timezone: string = "UTC",
  expiresIn: number = 6 * 60 * 60 // 6 hours
): Promise<{ accessToken: string; refreshToken: string }> {
  const now = Math.floor(Date.now() / 1000);

  const accessPayload = {
    userId: userId,
    exp: now + expiresIn,
    last_action: now,
  };

  const refreshPayload = {
    userId: userId,
    exp: now + 24 * 60 * 60, // 24 hours
  };

  const accessToken = await new SignJWT(accessPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(now + expiresIn)
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT(refreshPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(now + 24 * 60 * 60) // 24 hours
    .sign(JWT_REFRESH_SECRET);

  return {
    accessToken,
    refreshToken,
  };
}

export { verifyAccessToken };

// Password Setup Token
export async function generatePasswordSetupToken(
  email: string
): Promise<string> {
  const expire =
    Math.floor(Date.now() / 1000) + PASSWORD_TOKEN_EXPIRATION_MINUTES * 60;
  const payload = { email: email, exp: expire };
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expire)
    .sign(PASSWORD_SECRET);
  return token;
}

export async function decodePasswordSetupToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, PASSWORD_SECRET);

    if (
      typeof payload === "object" &&
      payload !== null &&
      "email" in payload &&
      typeof payload.email === "string"
    ) {
      return payload.email;
    }

    return null;
  } catch {
    return null;
  }
}

// Blacklist check
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const rows = await db
    .select({ id: blacklistTokens.id })
    .from(blacklistTokens)
    .where(eq(blacklistTokens.token, token))
    .limit(1);
  return rows.length > 0;
}

// Revoke token and clear cookies
export async function revokeAndDeleteToken(
  token: string,
  userId?: string,
  refresh?: string
): Promise<void> {
  // Blacklist token
  if (!(await isTokenBlacklisted(token))) {
    await db.insert(blacklistTokens).values({ token });
  }

  // Remove session from the user's sessions array
  if (userId) {
    await db
      .update(users)
      .set({
        sessions: sql`COALESCE(${users.sessions}, '[]'::jsonb) - ${token}`,
      })
      .where(eq(users.id, userId));
  }
}
