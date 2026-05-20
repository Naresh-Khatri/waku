import "@/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";

import { env } from "@/env";
import { TRPCReactProvider } from "@/trpc/react";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Waku",
  description: "AI-assisted image templates with a URL-as-API contract.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the editor reach behind notches; safe-area insets handle the chrome.
  // No maximumScale — locking zoom is a WCAG 1.4.4 violation.
  viewportFit: "cover",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const umamiScript = env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const umamiId = env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        {umamiScript && umamiId ? (
          <Script
            defer
            src={umamiScript}
            data-website-id={umamiId}
            strategy="afterInteractive"
          />
        ) : null}
        <TRPCReactProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
