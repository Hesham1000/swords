import { NextRequest, NextResponse } from "next/server";
import { verifyAccessTokenEdge } from "./app/lib/auth/edge";

const PROTECTED_ADMIN_ROUTES = [
  "/dashboard",
  "/products",
  "/invoices",
  "/wallet",
  "/history",
];

function isProtectedAdminRoute(pathname: string): boolean {
  return PROTECTED_ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip for static files and public auth routes
  if (
    pathname.includes(".") || // static files like .ico, .png, etc.
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // 2. Get the access token from cookies
  const accessToken = request.cookies.get("access_token")?.value;

  // 3. Verify the token
  let isValid = false;
  if (accessToken) {
    try {
      isValid = (await verifyAccessTokenEdge(accessToken)) !== null;
    } catch {
      isValid = false;
    }
  }

  // 4. Handle protection logic

  // If it's a protected API route and not authenticated
  if (pathname.startsWith("/api") && !isValid) {
    return NextResponse.json(
      { error: "Unauthorized access. Please sign in." },
      { status: 401 }
    );
  }

  // If it's a protected admin page and not authenticated
  if (isProtectedAdminRoute(pathname) && !isValid) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated and trying to access sign-in or signup pages, redirect to dashboard
  if (isValid && (pathname === "/sign-in" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
