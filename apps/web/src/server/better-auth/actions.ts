"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/better-auth";
import {
  LAST_USED_COOKIE,
  LAST_USED_MAX_AGE,
  type AuthProvider,
} from "@/server/better-auth/last-used";

function safeCallback(callbackURL: string): string {
  return callbackURL.startsWith("/") && !callbackURL.startsWith("//")
    ? callbackURL
    : "/";
}

export async function signInWithProviderAction(
  provider: AuthProvider,
  callbackURL: string,
) {
  (await cookies()).set(LAST_USED_COOKIE, provider, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LAST_USED_MAX_AGE,
  });

  const res = await auth.api.signInSocial({
    body: { provider, callbackURL: safeCallback(callbackURL) },
  });
  if (!res.url) throw new Error("No URL returned from signInSocial");
  redirect(res.url);
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
