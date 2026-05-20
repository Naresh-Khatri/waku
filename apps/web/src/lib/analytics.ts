// Thin wrapper around the Umami `script.js` snippet attached in the root
// layout. Safe to call before umami loads (no-op), during SSR (no window),
// and from event handlers (errors are swallowed so analytics never breaks UX).
//
// Event names are kebab-cased verbs in past/present tense. Props are flat
// scalars only — Umami stores them as event data columns.

declare global {
  interface Window {
    umami?: {
      track: (
        eventOrFn:
          | string
          | ((props: Record<string, unknown>) => Record<string, unknown>),
        data?: Record<string, unknown>,
      ) => void;
    };
  }
}

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

export function track(event: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  try {
    if (props) {
      window.umami?.track(event, props);
    } else {
      window.umami?.track(event);
    }
  } catch {
    // analytics shouldn't break the app
  }
}
