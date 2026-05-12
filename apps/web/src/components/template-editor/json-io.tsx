"use client";

import { Braces } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TemplateDocumentZ } from "./schema";
import { useEditor } from "./store";

export function JsonIoButton() {
  const getDocument = useEditor((s) => s.getDocument);
  const loadDocument = useEditor((s) => s.loadDocument);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const onOpenChange = (next: boolean) => {
    if (next) {
      setValue(JSON.stringify(getDocument(), null, 2));
      setError(null);
      setCopyState("idle");
    }
    setOpen(next);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setError("Clipboard write failed");
    }
  };

  const onLoad = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }
    const result = TemplateDocumentZ.safeParse(parsed);
    if (!result.success) {
      const first = result.error.issues[0];
      const path = first?.path.join(".") || "(root)";
      setError(`${path}: ${first?.message ?? "validation failed"}`);
      return;
    }
    loadDocument(result.data);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-xs text-zinc-700"
          title="View / paste document JSON"
        >
          <Braces className="h-3.5 w-3.5" />
          JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Document JSON</DialogTitle>
          <DialogDescription>
            Copy the current template, or paste a new one and click Load.
            Pasted JSON is validated against the schema.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          spellCheck={false}
          className="h-[420px] w-full resize-none rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-800 outline-none focus:border-zinc-400"
        />
        {error ? (
          <p className="text-xs text-rose-600">{error}</p>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCopy}>
            {copyState === "copied" ? "Copied" : "Copy"}
          </Button>
          <Button type="button" size="sm" onClick={onLoad}>
            Load
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
