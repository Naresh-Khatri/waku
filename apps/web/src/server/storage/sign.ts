import { createHmac, timingSafeEqual } from "node:crypto";

const enc = (s: string) => Buffer.from(s, "utf8");

export const sign = (secret: string, payload: string): string =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export const verify = (secret: string, payload: string, sig: string): boolean => {
  const expected = sign(secret, payload);
  const a = enc(expected);
  const b = enc(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};
