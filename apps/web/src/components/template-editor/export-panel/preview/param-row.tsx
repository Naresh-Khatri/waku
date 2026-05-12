import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    case "url": {
      const v = typeof value === "string" ? value : (entry.default ?? "");
      return (
        <Input
          type="url"
          value={v}
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
    case "number": {
      const v = typeof value === "number" ? value : (entry.default ?? 0);
      return (
        <Input
          type="number"
          value={Number.isFinite(v) ? v : 0}
          min={entry.min}
          max={entry.max}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className={inputCls}
        />
      );
    }
    case "boolean": {
      const v = typeof value === "boolean" ? value : (entry.default ?? false);
      return (
        <label className="flex h-7 items-center gap-2">
          <Checkbox checked={v} onCheckedChange={(c) => onChange(c === true)} />
          <span className="text-[11px] text-zinc-500">
            {v ? "true" : "false"}
          </span>
        </label>
      );
    }
    case "enum": {
      const v =
        typeof value === "string" && entry.values.includes(value)
          ? value
          : (entry.default ?? entry.values[0]);
      return (
        <Select value={v} onValueChange={(next) => onChange(next)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entry.values.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }
}
