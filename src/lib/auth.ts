import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "ADMIN";
  teamId: string | null;
  teamName?: string;
  emailVerified?: boolean;
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 jours
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.emailVerified === false) {
    redirect(`/verify-email?email=${encodeURIComponent(session.email)}`);
  }

  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    redirect("/");
  }
  return session;
}

export async function checkAdminSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Authentification requise.");
  }
  if (session.role !== "ADMIN") {
    throw new Error("Droits administrateur requis.");
  }
  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
}