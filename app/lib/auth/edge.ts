import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verifyAccessTokenEdge(
  token: string
): Promise<{ userId: string; exp: number; iat: number } | null> {
  try {
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Type guard to ensure the payload has the expected structure
    if (
      typeof payload === "object" &&
      payload !== null &&
      "userId" in payload &&
      typeof payload.userId === "string" &&
      "exp" in payload &&
      typeof payload.exp === "number"
    ) {
      return {
        userId: payload.userId,
        exp: payload.exp,
        iat: (payload.iat as number) || 0,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
