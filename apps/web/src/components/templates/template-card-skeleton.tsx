import { cn } from "@/lib/utils";

export function TemplateCardSkeleton({
  aspectRatio = "40 / 21",
  className,
}: {
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative block overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a]",
        className,
      )}
      style={{ aspectRatio }}
      aria-hidden
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#111827] via-[#0f1626] to-[#0b0f1a]" />
    </div>
  );
}
