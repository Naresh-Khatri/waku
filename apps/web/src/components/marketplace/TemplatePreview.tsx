"use client";

import { useEffect, useRef, useState } from "react";
import type { Node } from "@waku/ir";
import { resolve } from "@waku/ir";

import { IRRenderer } from "@/components/editor/IRRenderer";

type Props = {
  ir: Node;
  values?: Record<string, unknown>;
};

export function TemplatePreview({ ir, values }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const w = ir.type === "frame" ? ir.w : 1200;
  const h = ir.type === "frame" ? ir.h : 630;

  useEffect(() => {
    const update = () => {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const next = Math.min(parent.clientWidth / w, 1);
      setScale(next);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current?.parentElement)
      ro.observe(containerRef.current.parentElement);
    return () => ro.disconnect();
  }, [w]);

  let resolved: Node;
  try {
    resolved = resolve(ir, values ?? {});
  } catch {
    resolved = ir;
  }

  return (
    <div
      style={{
        width: "100%",
        height: h * scale,
        overflow: "hidden",
        background: "#0a0e17",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: w,
          height: h,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
        }}
      >
        <IRRenderer ir={resolved} />
      </div>
    </div>
  );
}
