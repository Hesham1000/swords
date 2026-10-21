import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "./auth/token";
import { isUuid } from "./db";

export interface AuthUser {
  userId: string;
  exp: number;
  iat: number;
}

export async function requireAuth(
  request: NextRequest
): Promise<AuthUser | NextResponse> {
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyAccessToken(token);

  if (!payload || !isUuid(payload.userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return {
    userId: payload.userId,
    exp: payload.exp,
    iat: payload.iat,
  };
}

export function isAuthFailure(
  result: AuthUser | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
