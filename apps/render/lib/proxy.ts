/**
 * Server-side image proxy with SSRF guard.
 *
 * Threat model:
 *  - users supply arbitrary URLs in template params
 *  - we render in our own VPC; we MUST NOT reach internal services,
 *    cloud metadata endpoints, or RFC1918/loopback/link-local IPs
 *  - we MUST follow redirects, but re-validate on every hop
 *  - we MUST cap response size and time
 *  - we MUST only forward image MIME types
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_REDIRECTS = 3;
export const TIMEOUT_MS = 30_000;

export const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

export class ProxyError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ProxyError";
  }
}

const PRIVATE_V4_BLOCKS: Array<[number, number]> = [
  [ipv4ToInt("0.0.0.0"), 8],
  [ipv4ToInt("10.0.0.0"), 8],
  [ipv4ToInt("100.64.0.0"), 10], // CGNAT
  [ipv4ToInt("127.0.0.0"), 8],
  [ipv4ToInt("169.254.0.0"), 16], // link-local incl. AWS metadata
  [ipv4ToInt("172.16.0.0"), 12],
  [ipv4ToInt("192.0.0.0"), 24],
  [ipv4ToInt("192.0.2.0"), 24],
  [ipv4ToInt("192.168.0.0"), 16],
  [ipv4ToInt("198.18.0.0"), 15],
  [ipv4ToInt("198.51.100.0"), 24],
  [ipv4ToInt("203.0.113.0"), 24],
  [ipv4ToInt("224.0.0.0"), 4], // multicast
  [ipv4ToInt("240.0.0.0"), 4], // reserved
];

function ipv4ToInt(addr: string): number {
  const p = addr.split(".").map(Number);
  return ((p[0]! << 24) | (p[1]! << 16) | (p[2]! << 8) | p[3]!) >>> 0;
}

function isPrivateV4(addr: string): boolean {
  if (isIP(addr) !== 4) return false;
  const ip = ipv4ToInt(addr);
  return PRIVATE_V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ip & mask) === (base & mask);
  });
}

function isPrivateV6(addr: string): boolean {
  if (isIP(addr) !== 6) return false;
  const a = addr.toLowerCase();
  if (a === "::" || a === "::1") return true;
  // unique local fc00::/7
  if (/^f[cd][0-9a-f]{2}:/.test(a)) return true;
  // link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/.test(a)) return true;
  // IPv4-mapped: re-check the v4 portion
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateV4(mapped[1]!);
  return false;
}

export function isPrivateAddress(addr: string): boolean {
  return isPrivateV4(addr) || isPrivateV6(addr);
}

async function assertPublicHost(hostname: string): Promise<void> {
  // If hostname is already an IP literal, check it directly.
  if (isIP(hostname) !== 0) {
    if (isPrivateAddress(hostname)) {
      throw new ProxyError(400, "private_host", `host ${hostname} is private`);
    }
    return;
  }
  let entries;
  try {
    entries = await lookup(hostname, { all: true });
  } catch {
    throw new ProxyError(400, "dns_failed", `failed to resolve ${hostname}`);
  }
  if (entries.length === 0) {
    throw new ProxyError(400, "dns_empty", `no addresses for ${hostname}`);
  }
  for (const e of entries) {
    if (isPrivateAddress(e.address)) {
      throw new ProxyError(400, "private_host", `${hostname} resolves to private ${e.address}`);
    }
  }
}

function assertHttpUrl(u: URL): void {
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new ProxyError(400, "bad_scheme", `scheme ${u.protocol} not allowed`);
  }
  // userinfo is a smell — credentials in image URLs should never happen
  if (u.username || u.password) {
    throw new ProxyError(400, "userinfo_forbidden", "URL must not contain credentials");
  }
}

export type ProxyResult = {
  body: Uint8Array;
  contentType: string;
};

export async function proxyImage(rawUrl: string): Promise<ProxyResult> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new ProxyError(400, "bad_url", "invalid URL");
  }

  let redirects = 0;
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    while (true) {
      assertHttpUrl(current);
      await assertPublicHost(current.hostname);

      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          accept: "image/*",
          // strip any cookies/auth — fetch doesn't add them by default
          "user-agent": "WakuRenderer/0.0 (+https://waku.dev)",
        },
      });

      // Manual redirect handling so each hop re-validates the host.
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) {
          throw new ProxyError(502, "bad_redirect", "redirect without Location");
        }
        if (++redirects > MAX_REDIRECTS) {
          throw new ProxyError(508, "too_many_redirects", "redirect limit");
        }
        current = new URL(loc, current);
        continue;
      }

      if (!res.ok) {
        throw new ProxyError(res.status === 404 ? 404 : 502, "upstream_error", `upstream ${res.status}`);
      }

      const ct = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
      if (!ALLOWED_CONTENT_TYPES.has(ct)) {
        throw new ProxyError(415, "bad_content_type", `content-type ${ct} not allowed`);
      }

      const lenHeader = res.headers.get("content-length");
      if (lenHeader && Number(lenHeader) > MAX_BYTES) {
        throw new ProxyError(413, "too_large", `content-length ${lenHeader} exceeds cap`);
      }

      // Stream + cap
      const reader = res.body?.getReader();
      if (!reader) {
        throw new ProxyError(502, "no_body", "upstream returned empty body");
      }
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          throw new ProxyError(413, "too_large", "response exceeded byte cap");
        }
        chunks.push(value);
      }
      const body = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        body.set(c, off);
        off += c.byteLength;
      }
      return { body, contentType: ct };
    }
  } finally {
    clearTimeout(timeout);
  }
}
