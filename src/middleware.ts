import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "presence_bureau_secret_key_super_secure_12345"
);

const PUBLIC_ROUTES = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;
  let user: any = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      user = payload;
    } catch {
      // Ignorer si invalide
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Non authentifié -> redirection login
  if (!user && !isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Déjà connecté -> redirection accueil
  if (user && isPublicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Zone Admin réservée aux ADMIN
  if (pathname.startsWith("/admin") && user?.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};