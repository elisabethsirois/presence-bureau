import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Configuration critique : variable d'environnement AUTH_SECRET manquante en production.");
    }
    return new TextEncoder().encode("presence_bureau_dev_fallback_secret_key_12345");
  }
  return new TextEncoder().encode(secret);
}

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
  let user: { id: string; role?: string; [key: string]: unknown } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      user = payload as unknown as { id: string; role?: string };
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