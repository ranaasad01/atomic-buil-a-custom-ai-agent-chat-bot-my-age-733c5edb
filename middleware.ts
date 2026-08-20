import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_ROUTES = [
  "/chat",
  "/chat-home-main-agent-chat-interface",
  "/history",
  "/history-past-chat-sessions",
  "/settings",
  "/settings-api-key-agent-configuration",
];

const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  // Refresh the Supabase session (rotates cookies if needed)
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // Pass the pathname as a header so server components can read it
  response.headers.set("x-pathname", pathname);

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Not authenticated trying to access a protected route → redirect to /login
  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user trying to access /login or /signup → redirect to /chat
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
