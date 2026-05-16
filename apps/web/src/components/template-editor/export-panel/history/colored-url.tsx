// Render a snapshot URL with each `?key=value` colored by key. Keys hash to a
// fixed palette so the same param always reads in the same color across rows —
// scanning a list of similar URLs becomes pattern-matching, not string-diffing.
export function ColoredUrl({ url }: { url: string }) {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) {
    return <span className="text-zinc-600">{url}</span>;
  }
  const base = url.slice(0, qIdx);
  const pairs = url.slice(qIdx + 1).split("&");
  return (
    <>
      <span className="text-zinc-600">{base}</span>
      {pairs.map((pair, i) => {
        const sep = i === 0 ? "?" : "&";
        const eqIdx = pair.indexOf("=");
        if (eqIdx === -1) {
          return (
            <span key={`${pair}-${i}`} className="text-zinc-500">
              {sep}
              {pair}
            </span>
          );
        }
        const k = pair.slice(0, eqIdx);
        const v = pair.slice(eqIdx + 1);
        const color = bindColor(k);
        return (
          <span key={`${k}-${i}`}>
            <span className="text-zinc-400">{sep}</span>
            <span className={`font-semibold ${color}`}>{k}</span>
            <span className="text-zinc-400">=</span>
            <span className={color}>{v}</span>
          </span>
        );
      })}
    </>
  );
}

// Single-line variant for tight spots (the copy bar). The base host/path is
// boilerplate, so it gets `truncate` and yields space first; the params are
// what actually vary, so they stay pinned adjacent to the base and fully
// visible, with just the param name bolded. Net: you always see the params,
// the long base elides — no color noise.
export function InlineUrl({ url }: { url: string }) {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) {
    return (
      <span className="block min-w-0 truncate text-emerald-900">{url}</span>
    );
  }
  const base = url.slice(0, qIdx);
  const pairs = url.slice(qIdx + 1).split("&");
  return (
    <span className="flex min-w-0 items-baseline text-emerald-900">
      {/* flex-initial: shrinks/truncates on overflow but never grows, so the
          params stay adjacent instead of being pushed to the far edge. */}
      <span className="min-w-0 flex-initial truncate text-emerald-700/70">
        {base}
      </span>
      <span className="shrink-0">
        {pairs.map((pair, i) => {
          const sep = i === 0 ? "?" : "&";
          const eqIdx = pair.indexOf("=");
          if (eqIdx === -1) {
            return (
              <span key={`${pair}-${i}`} className="text-emerald-700/70">
                {sep}
                {pair}
              </span>
            );
          }
          const k = pair.slice(0, eqIdx);
          const v = pair.slice(eqIdx + 1);
          return (
            <span key={`${k}-${i}`}>
              <span className="text-emerald-700/60">{sep}</span>
              <span className="font-semibold">{k}</span>
              <span className="text-emerald-700/60">=</span>
              <span>{v}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

// Tailwind needs full class strings present in source for JIT. Same key always
// lands on the same color so a param reads consistently across snapshot rows.
const BIND_PALETTE = [
  "text-rose-700",
  "text-amber-700",
  "text-emerald-700",
  "text-sky-700",
  "text-violet-700",
  "text-pink-700",
  "text-teal-700",
  "text-indigo-700",
];

function bindColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return BIND_PALETTE[h % BIND_PALETTE.length] ?? BIND_PALETTE[0]!;
}
