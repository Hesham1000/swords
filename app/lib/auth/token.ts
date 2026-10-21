import { SignJWT, jwtVerify } from "jose";
import { query, isUuid } from "../db";
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
  const result = await query(`SELECT 1 FROM blacklist_tokens WHERE token = $1 LIMIT 1`, [token]);
  return result.rowCount! > 0;
}

// Revoke token and clear cookies
export async function revokeAndDeleteToken(
  token: string,
  userId?: string,
  refresh?: string
): Promise<void> {
  // Blacklist token
  if (!(await isTokenBlacklisted(token))) {
    await query(
      `INSERT INTO blacklist_tokens (token, user_id, revoked_at)
       VALUES ($1, $2, now())
       ON CONFLICT (token) DO NOTHING`,
      [token, userId && isUuid(userId) ? userId : null]
    );
  }

  // Remove session from the user's sessions jsonb array
  if (userId && isUuid(userId)) {
    await query(
      `UPDATE users
       SET sessions = (
         SELECT COALESCE(jsonb_agg(s), '[]'::jsonb)
         FROM jsonb_array_elements(COALESCE(sessions, '[]'::jsonb)) s
         WHERE s->>'token' <> $1
       )
       WHERE id = $2`,
      [token, userId]
    );
  }
}
