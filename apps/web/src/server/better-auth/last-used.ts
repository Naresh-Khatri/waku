import { cookies } from "next/headers";

export type AuthProvider = "github" | "google";

export const LAST_USED_COOKIE = "waku_last_auth_provider";
export const LAST_USED_MAX_AGE = 60 * 60 * 24 * 365;

export async function getLastUsedProvider(): Promise<AuthProvider | null> {
  const value = (await cookies()).get(LAST_USED_COOKIE)?.value;
  return value === "github" || value === "google" ? value : null;
}
