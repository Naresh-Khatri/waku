"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState, type MouseEvent, type ReactNode } from "react";

import { TemplatePreview } from "@/app/(app)/_components/template-preview";
import type { TemplateDocument } from "@/components/template-editor/types";
import { cn } from "@/lib/utils";

export type TemplateCardProps = {
  href: string;
  name: string;
  description?: string | null;
  tags?: string[];
  thumbnailUrl?: string | null;
  document?: TemplateDocument;
  aspectRatio?: string;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean;
  overlay?: ReactNode;
};

const REVEAL = {
  rest: { y: "100%" },
  hover: { y: 0 },
} as const;

const FADE = {
  rest: { opacity: 0 },
  hover: { opacity: 1 },
} as const;

export function TemplateCard({
  href,
  name,
  description,
  tags,
  thumbnailUrl,
  document,
  aspectRatio = "40 / 21",
  className,
  onClick,
  prefetch,
  overlay,
}: TemplateCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onClick={onClick}
      prefetch={prefetch}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a] outline-none transition-colors duration-200 hover:border-[#374151] focus-visible:ring-2 focus-visible:ring-[#7c5cff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1a]",
        className,
      )}
      style={{ aspectRatio }}
      aria-label={name}
    >
      <motion.div
        className="absolute inset-0"
        animate={{ scale: hovered ? 1.03 : 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 26 }}
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : document ? (
          <div className="h-full w-full [&>div]:!aspect-auto [&>div]:!h-full">
            <TemplatePreview document={document} />
          </div>
        ) : (
          <div className="h-full w-full bg-[#0b0f1a]" />
        )}
      </motion.div>

      <AnimatePresence>
        {overlay ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]"
          >
            {overlay}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial="rest"
        animate={hovered ? "hover" : "rest"}
        variants={FADE}
        transition={{ duration: 0.2 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/55 to-transparent"
      />

      <motion.div
        initial="rest"
        animate={hovered ? "hover" : "rest"}
        variants={REVEAL}
        transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.6 }}
        className="pointer-events-none absolute inset-x-0 bottom-0 p-4"
      >
        <h3 className="text-sm font-medium text-white drop-shadow-sm sm:text-base">
          {name}
        </h3>
        {description ? (
          <p className="mt-1 line-clamp-2 text-xs text-white/75">
            {description}
          </p>
        ) : null}
        {tags && tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </motion.div>
    </Link>
  );
}
