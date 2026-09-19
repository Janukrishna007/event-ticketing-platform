import { cookies } from "next/headers";

import {
  establishUserProfile,
  firebaseAuth,
  requestHasTrustedOrigin,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!requestHasTrustedOrigin(request)) {
    return Response.json({ error: "The sign-in request could not be verified." }, { status: 403 });
  }
  try {
    const { idToken } = await request.json() as { idToken?: string };
    if (!idToken) return Response.json({ error: "Google sign-in proof is missing." }, { status: 400 });

    const decoded = await firebaseAuth().verifyIdToken(idToken, true);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return Response.json({ error: "Please sign in with Google again." }, { status: 401 });
    }
    const user = await establishUserProfile(decoded);
    const sessionCookie = await firebaseAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
    (await cookies()).set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
      path: "/",
    });
    return Response.json({ user });
  } catch (error) {
    const message = error instanceof Error && error.message === "VERIFIED_EMAIL_REQUIRED"
      ? "Use a Google account with a verified email address."
      : "Google sign-in could not be completed.";
    console.error("Unable to establish Firebase session", error);
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  if (!requestHasTrustedOrigin(request)) {
    return Response.json({ error: "The sign-out request could not be verified." }, { status: 403 });
  }
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return Response.json({ signedOut: true });
}
