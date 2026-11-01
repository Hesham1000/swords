import { NextRequest, NextResponse } from "next/server";
import { verifyAccessTokenEdge } from "./app/lib/auth/edge";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/products",
  "/invoices",
  "/wallet",
  "/history",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and Next.js internals
  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // Only enforce protection on the five admin routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Read the access_token cookie
  const accessToken = request.cookies.get("access_token")?.value;

  // Verify the token using the existing edge helper
  let isValid = false;
  if (accessToken) {
    try {
      isValid = (await verifyAccessTokenEdge(accessToken)) !== null;
    } catch {
      isValid = false;
    }
  }

  // Redirect to /sign-in if the token is missing, invalid, or expired
  if (!isValid) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/invoices/:path*",
    "/wallet/:path*",
    "/history/:path*",
  ],
};
