import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import {
  getUserCollection,
  getBlacklistCollection,
} from "../mongoDB";
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

// Verify Refresh Token (Edge Runtime Compatible)
// export async function verifyRefreshToken(
//   token: string
// ): Promise<JWTPayloadCustom | null> {
//   try {
//     const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);

//     // Type guard for refresh token payload
//     if (
//       typeof payload === "object" &&
//       payload !== null &&
//       "userId" in payload &&
//       typeof payload.userId === "string" &&
//       "exp" in payload &&
//       typeof payload.exp === "number"
//     ) {
//       return {
//         userId: payload.userId as string,
//         exp: payload.exp as number,
//         iat: (payload.iat as number) || 0,
//       };
//     }

//     return null;
//   } catch {
//     return null;
//   }
// }

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















// Lazy DB initialization (no top-level await)
async function getCollections() {
  const blacklist = await getBlacklistCollection();
  const users = await getUserCollection();
  return { blacklist, users };
}

// Blacklist check
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const { blacklist } = await getCollections();
  return !!(await blacklist.findOne({ token }));
}

// Revoke token and clear cookies
export async function revokeAndDeleteToken(
  token: string,
  userId?: string,
  refresh?: string
): Promise<void> {
  const { blacklist, users } = await getCollections();

  // Blacklist token
  if (!(await isTokenBlacklisted(token))) {
    await blacklist.insertOne({
      token,
      revoked_at: new Date(),
      ...(userId ? { user_id: new ObjectId(userId) } : {}),
    });
  }

  // Remove session
  if (userId) {
    await users.updateOne({ _id: new ObjectId(userId) }, {
      $pull: { sessions: { token } },
    } as any);
  }
}
