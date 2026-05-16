"use client";

import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

/**
 * True below the Tailwind `md` breakpoint (768px) — phones and narrow tablets,
 * including small phones in landscape. Initializes to `false` so the server
 * render and first client render agree (no hydration mismatch); the real value
 * is read on mount and kept in sync with viewport/orientation changes.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
