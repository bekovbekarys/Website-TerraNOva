import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";

const COOKIE_NAME = "terranova_session";
const SESSION_SECRET =
  process.env.SESSION_SECRET || "insecure-development-secret-please-change";
const key = new TextEncoder().encode(SESSION_SECRET);
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key);
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createSessionToken({ userId });
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  affiliation: string | null;
  orcid: string | null;
  role: string;
};

/**
 * Reads the session cookie, verifies it, and returns the current user (or null).
 * Safe to call from any server component or route handler.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    const userId = payload.userId as string | undefined;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        affiliation: true,
        orcid: true,
        role: true,
      },
    });
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export function isAdminEmail(email: string): boolean {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  return adminEmail.length > 0 && email.toLowerCase().trim() === adminEmail;
}
