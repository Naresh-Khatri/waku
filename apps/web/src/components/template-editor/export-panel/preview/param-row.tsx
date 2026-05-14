import { Input } from "@/components/ui/input";
import { ColorPicker } from "../../color-picker";
import type { ParamSchemaEntry } from "../../types";

export function ParamRow({
  name,
  entry,
  value,
  onChange,
}: {
  name: string;
  entry: ParamSchemaEntry;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] text-indigo-700">{`{${name}}`}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
          {entry.kind}
        </span>
      </div>
      <ParamControl entry={entry} value={value} onChange={onChange} />
    </div>
  );
}

function ParamControl({
  entry,
  value,
  onChange,
}: {
  entry: ParamSchemaEntry;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputCls = "h-7 text-xs";

  switch (entry.kind) {
    case "string": {
      const v = typeof value === "string" ? value : (entry.default ?? "");
      return (
        <Input
          type="text"
          value={v}
          maxLength={entry.maxLen}
          onChange={(e) => onChange(e.target.value)}
          placeholder={entry.default}
          className={inputCls}
        />
      );
    }
    case "color": {
      const v =
        typeof value === "string" ? value : (entry.default ?? "#000000");
      return <ColorPicker value={v} onChange={onChange} label="Param color" />;
    }
  }
}
