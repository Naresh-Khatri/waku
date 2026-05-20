"use client";

import { AnimatePresence, motion } from "motion/react";
import { LogOutIcon } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  signInWithProviderAction,
  signOutAction,
} from "@/server/better-auth/actions";
import type { AuthProvider } from "@/server/better-auth/last-used";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "./ui/badge";

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Props = {
  loggedIn: boolean;
  user?: SessionUser | null;
  lastUsed?: AuthProvider | null;
  callbackURL?: string;
  triggerLabel?: string;
  className?: string;
};

export function AuthButton({
  loggedIn,
  user = null,
  lastUsed = null,
  callbackURL = "/",
  triggerLabel = "Sign in",
  className,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [triggerRect, setTriggerRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const origin = triggerRect
    ? {
        x: triggerRect.left + triggerRect.width / 2,
        y: triggerRect.top + triggerRect.height / 2,
      }
    : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while the overlay is visible. We flip `locked` on open and
  // clear it from AnimatePresence's onExitComplete so the scrollbar doesn't
  // reappear mid-close-animation and shift the layout.
  useEffect(() => {
    if (!locked) return;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [locked]);

  if (loggedIn) {
    const displayName = user?.name?.trim() || user?.email || "Account";
    const initial = displayName.slice(0, 1).toUpperCase();
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              className,
            )}
            aria-label="Account menu"
          >
            <Avatar size="sm">
              {user?.image ? (
                <AvatarImage src={user.image} alt={displayName} />
              ) : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <div className="flex items-center gap-2 px-1.5 py-1.5">
            <Avatar size="sm">
              {user?.image ? (
                <AvatarImage src={user.image} alt={displayName} />
              ) : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{displayName}</div>
              {user?.email && user.email !== displayName ? (
                <div className="truncate text-xs text-muted-foreground">
                  {user.email}
                </div>
              ) : null}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              track("auth_signout");
              startTransition(() => signOutAction());
            }}
          >
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Snapshot the trigger's viewport rect so (a) the radial reveal expands from
  // its center and (b) the Close button can sit in exactly the same spot.
  const handleOpen = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setTriggerRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
    setOpen(true);
    setLocked(true);
  };

  // Radius that's guaranteed to cover the viewport from any corner. We use the
  // longest diagonal from the origin to any of the four corners.
  const maxRadius = (() => {
    if (!origin) return 1000;
    if (typeof window === "undefined") return 1000;
    const { innerWidth: w, innerHeight: h } = window;
    return Math.ceil(
      Math.max(
        Math.hypot(origin.x, origin.y),
        Math.hypot(w - origin.x, origin.y),
        Math.hypot(origin.x, h - origin.y),
        Math.hypot(w - origin.x, h - origin.y),
      ),
    );
  })();

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={className}
      >
        {triggerLabel}
      </Button>

      <AnimatePresence onExitComplete={() => setLocked(false)}>
        {open && origin && triggerRect && (
          <motion.div
            className="bg-primary text-primary-foreground fixed inset-0 z-50"
            initial={{
              clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
            }}
            animate={{
              clipPath: `circle(${maxRadius}px at ${origin.x}px ${origin.y}px)`,
            }}
            exit={{
              clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`,
            }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="fixed z-10"
              style={{
                top: triggerRect.top,
                left: triggerRect.left,
                width: triggerRect.width,
                height: triggerRect.height,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.25 } }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
            >
              <Button
                type="button"
                onClick={() => setOpen(false)}
                className={cn("h-full w-full", className)}
              >
                Close
              </Button>
            </motion.div>

            <motion.div
              className="flex h-full w-full flex-col items-center justify-center gap-3 px-6"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    delayChildren: 0.3,
                    staggerChildren: 0.08,
                  },
                },
              }}
            >
              <ProviderCard
                provider="github"
                label="Continue with GitHub"
                isLastUsed={lastUsed === "github"}
                callbackURL={callbackURL}
                pending={pending}
                startTransition={startTransition}
              />
              <ProviderCard
                provider="google"
                label="Continue with Google"
                isLastUsed={lastUsed === "google"}
                callbackURL={callbackURL}
                pending={pending}
                startTransition={startTransition}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Inline provider list — no overlay, no portal. For surfaces that are already
// their own modal (e.g. a dialog) so we don't nest a fullscreen reveal inside
// a transformed container (which traps `position: fixed`).
export function AuthProviders({
  lastUsed = null,
  callbackURL = "/",
  className,
}: {
  lastUsed?: AuthProvider | null;
  callbackURL?: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className={cn("flex w-full flex-col items-center gap-3", className)}>
      <ProviderCard
        provider="github"
        label="Continue with GitHub"
        isLastUsed={lastUsed === "github"}
        callbackURL={callbackURL}
        pending={pending}
        startTransition={startTransition}
      />
      <ProviderCard
        provider="google"
        label="Continue with Google"
        isLastUsed={lastUsed === "google"}
        callbackURL={callbackURL}
        pending={pending}
        startTransition={startTransition}
      />
    </div>
  );
}

function ProviderCard({
  provider,
  label,
  isLastUsed,
  callbackURL,
  pending,
  startTransition,
}: {
  provider: AuthProvider;
  label: string;
  isLastUsed: boolean;
  callbackURL: string;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const Logo = provider === "github" ? GithubLogo : GoogleLogo;
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative w-full max-w-xs"
    >
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          track("auth_signin_click", {
            provider,
            last_used: isLastUsed,
            callback_url: callbackURL,
          });
          startTransition(() => signInWithProviderAction(provider, callbackURL));
        }}
        className="focus-visible:ring-3 inline-flex h-11 w-full items-center justify-center gap-2 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-white/30 disabled:opacity-60"
      >
        <Logo />
        <span>{label}</span>
      </Button>
      {isLastUsed && (
        <Badge
          aria-label="Last used"
          className="border-1 absolute -top-1 right-1 z-10 border-white/30 text-[11px]"
        >
          Last
        </Badge>
      )}
    </motion.div>
  );
}

function GithubLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4 shrink-0 fill-current"
    >
      <path d="M12 .5C5.73.5.74 5.5.74 11.77c0 4.99 3.23 9.21 7.71 10.71.56.1.77-.25.77-.55v-1.92c-3.14.68-3.8-1.51-3.8-1.51-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1.01 1.73 2.65 1.23 3.3.94.1-.73.39-1.23.71-1.51-2.51-.29-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.16-3.04-.12-.29-.5-1.44.11-3.01 0 0 .95-.3 3.1 1.16.9-.25 1.86-.37 2.82-.38.96.01 1.93.13 2.83.38 2.15-1.46 3.1-1.16 3.1-1.16.62 1.57.23 2.72.11 3.01.72.79 1.16 1.8 1.16 3.04 0 4.35-2.64 5.31-5.16 5.59.4.35.76 1.03.76 2.08v3.08c0 .3.2.66.78.55 4.48-1.5 7.7-5.72 7.7-10.71C23.26 5.5 18.27.5 12 .5z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-4 shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.3 5.2C41 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
