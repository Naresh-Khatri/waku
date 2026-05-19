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

// Single-line variant for the copy bar. Stays on one line (no wrap) so its
// horizontal-scroll container can pan a long encoded URL instead of clamping
// it. Param names stay bolded for scannability.
export function InlineUrl({ url }: { url: string }) {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) {
    return <span className="text-emerald-900">{url}</span>;
  }
  const base = url.slice(0, qIdx);
  const pairs = url.slice(qIdx + 1).split("&");
  return (
    <span className="text-emerald-900">
      <span className="text-emerald-700/70">{base}</span>
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
