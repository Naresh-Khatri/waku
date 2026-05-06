import { createHash } from "node:crypto";

export const RENDER_BUDGET_MS = 5_000;

export const hashParams = (params: Record<string, unknown>): string => {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 12);
};

export type RenderLog = {
  evt: "render";
  slug: string;
  version: number;
  params_hash: string;
  status: number;
  ms: number;
  err?: string;
};

export const logRender = (entry: RenderLog): void => {
  process.stdout.write(JSON.stringify(entry) + "\n");
};

export class RenderTimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`render exceeded ${ms}ms budget`);
    this.name = "RenderTimeoutError";
  }
}

export const withBudget = <T>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new RenderTimeoutError(ms)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
