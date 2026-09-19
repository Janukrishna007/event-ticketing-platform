import "server-only";

import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { firebaseAdminApp, firebaseDb } from "@/lib/firebase-admin";

export const SESSION_COOKIE_NAME = "events_session";
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export type UserRole = "attendee" | "organizer" | "coordinator";

export type CurrentUser = {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
  role: UserRole;
};

function configuredEmails(name: "ORGANIZER_EMAILS" | "COORDINATOR_EMAILS") {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function initialRole(email: string): UserRole {
  if (configuredEmails("ORGANIZER_EMAILS").has(email)) return "organizer";
  if (configuredEmails("COORDINATOR_EMAILS").has(email)) return "coordinator";
  return "attendee";
}

function isRole(value: unknown): value is UserRole {
  return value === "attendee" || value === "organizer" || value === "coordinator";
}

export async function establishUserProfile(token: DecodedIdToken): Promise<CurrentUser> {
  const email = token.email?.trim().toLowerCase();
  if (!email || !token.email_verified) throw new Error("VERIFIED_EMAIL_REQUIRED");

  const ref = firebaseDb().collection("users").doc(token.uid);
  const existing = await ref.get();
  const existingData = existing.data();
  const role = isRole(existingData?.role) ? existingData.role : initialRole(email);
  const name = token.name?.trim() || email.split("@")[0];
  const picture = token.picture?.trim() || null;

  await ref.set({
    email,
    emailVerified: true,
    displayName: name,
    photoURL: picture,
    role,
    provider: "google.com",
    lastSignedInAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });

  return { uid: token.uid, email, name, picture, role };
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;

  try {
    const decoded = await getAuth(firebaseAdminApp()).verifySessionCookie(value, true);
    const email = decoded.email?.trim().toLowerCase();
    if (!email || !decoded.email_verified) return null;
    const profile = await firebaseDb().collection("users").doc(decoded.uid).get();
    const data = profile.data();
    if (!profile.exists || !isRole(data?.role)) return null;
    return {
      uid: decoded.uid,
      email,
      name: typeof data.displayName === "string" && data.displayName.trim() ? data.displayName : decoded.name || email.split("@")[0],
      picture: typeof data.photoURL === "string" && data.photoURL ? data.photoURL : null,
      role: data.role,
    };
  } catch {
    return null;
  }
});

export async function requirePageUser(roles?: UserRole[], returnTo = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (roles && !roles.includes(user.role)) redirect("/access-denied");
  return user;
}

export async function authorizeApi(roles?: UserRole[]) {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  if (roles && !roles.includes(user.role)) {
    return { user: null, response: Response.json({ error: "Your account does not have access to this action." }, { status: 403 }) };
  }
  return { user, response: null };
}

export function firebaseAuth() {
  return getAuth(firebaseAdminApp());
}

export function requestHasTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  return origin === new URL(request.url).origin;
}
