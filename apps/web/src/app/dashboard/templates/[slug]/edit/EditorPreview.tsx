"use client";

import type { Node } from "@waku/ir";

import { IRRenderer } from "@/components/editor/IRRenderer";

const RENDER_BASE =
  process.env.NEXT_PUBLIC_RENDER_BASE_URL ?? "http://localhost:3001";

type Props = {
  ir: Node;
  handle: string;
  slug: string;
  version: number;
};

export default function EditorPreview({ ir, handle, slug, version }: Props) {
  const rendered = `${RENDER_BASE}/r/${handle}/${slug}/${version}`;
  const w = ir.type === "frame" ? ir.w : 1200;
  const h = ir.type === "frame" ? ir.h : 630;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Pane label="Editor preview (IRRenderer)">
        <Canvas w={w} h={h}>
          <IRRenderer ir={ir} />
        </Canvas>
      </Pane>
      <Pane label="Render service output">
        <Canvas w={w} h={h}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rendered}
            alt="rendered template"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </Canvas>
      </Pane>
    </div>
  );
}

function Pane({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
        {label}
      </div>
      {children}
    </section>
  );
}

function Canvas({
  w,
  h,
  children,
}: {
  w: number;
  h: number;
  children: React.ReactNode;
}) {
  // Scale the intrinsic w×h canvas to fit the column width while preserving aspect.
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a]">
      <div
        className="origin-top-left"
        style={{
          width: w,
          height: h,
          transform: "scale(var(--canvas-scale, 1))",
          transformOrigin: "top left",
        }}
        ref={(el) => {
          if (!el) return;
          const parent = el.parentElement;
          if (!parent) return;
          const update = () => {
            const scale = Math.min(parent.clientWidth / w, 1);
            el.style.setProperty("--canvas-scale", String(scale));
            parent.style.height = `${h * scale}px`;
          };
          update();
          const ro = new ResizeObserver(update);
          ro.observe(parent);
        }}
      >
        {children}
      </div>
    </div>
  );
}
