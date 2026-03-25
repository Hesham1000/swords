import { NextRequest, NextResponse } from "next/server";
import { verifyAccessTokenEdge } from "./app/lib/auth/edge";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define public paths and auth paths
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api");
  const isProtectedPage = pathname.startsWith("/dashboard");

  // Skip middleware for static files and public auth routes
  if (
    pathname.includes(".") || // static files like .ico, .png, etc.
    pathname.startsWith("/_next") ||
    isAuthRoute
  ) {
    return NextResponse.next();
  }

  // 2. Get the access token from cookies
  const accessToken = request.cookies.get("access_token")?.value;

  // 3. Verify the token
  let isValid = false;
  if (accessToken) {
    const payload = await verifyAccessTokenEdge(accessToken);
    if (payload) {
      isValid = true;
    }
  }

  // 4. Handle protection logic
  
  // If it's a protected API route and not authenticated
  if (isApiRoute && !isValid && !isAuthRoute) {
    return NextResponse.json(
      { error: "Unauthorized access. Please sign in." },
      { status: 401 }
    );
  }

  // If it's a protected page and not authenticated
  if (isProtectedPage && !isValid) {
    const signInUrl = new URL("/sign-in", request.url);
    // You can optionally add a callback URL
    // signInUrl.searchParams.set("callbackUrl", pathname);
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
     * - api (handled inside middleware for granularity)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
