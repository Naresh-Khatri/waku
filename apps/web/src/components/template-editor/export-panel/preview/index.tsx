import {
  OgBarePreview,
  OgPreviewActions,
  OgSocialPreview,
  type Platform,
  type RenderStatus,
} from "../og-preview";
import type { ParamSchemaEntry } from "../../types";
import { ParamRow } from "./param-row";
import { PlatformPicker } from "./platform-picker";

export function PreviewTab({
  entries,
  draftValues,
  setDraftValue,
  fullUrl,
  liveUrl,
  templateSlug,
  imageUrl,
  status,
  platform,
  onPlatform,
  handle,
  mobile = false,
}: {
  entries: [string, ParamSchemaEntry][];
  draftValues: Record<string, unknown>;
  setDraftValue: (name: string, value: unknown) => void;
  fullUrl: string | null;
  liveUrl?: string;
  templateSlug: string;
  imageUrl: string | null;
  status: RenderStatus;
  platform: Platform;
  onPlatform: (p: Platform) => void;
  handle: string;
  // Stacks params over preview instead of the desktop two-pane layout.
  mobile?: boolean;
}) {
  const showPreview = Boolean(liveUrl && fullUrl);

  if (mobile) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {showPreview ? (
          <div className="min-h-0 flex-1 border-b border-zinc-200">
            <OgBarePreview
              url={fullUrl}
              imageUrl={imageUrl}
              status={status}
            />
          </div>
        ) : null}

        <div className="max-h-[45%] shrink-0 overflow-y-auto overscroll-contain">
          {entries.length === 0 ? (
            <div className="px-4 py-4 text-[11px] text-zinc-500">
              Click the link icon next to a field to bind a param.
            </div>
          ) : (
            <div className="space-y-2 px-4 py-3">
              {entries.map(([name, entry]) => (
                <ParamRow
                  key={name}
                  name={name}
                  entry={entry}
                  value={draftValues[name]}
                  onChange={(v) => setDraftValue(name, v)}
                />
              ))}
            </div>
          )}
        </div>

        {liveUrl ? (
          <div className="shrink-0">
            <OgPreviewActions url={fullUrl} filename={templateSlug} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <div className="flex w-[280px] shrink-0 flex-col">
          {entries.length === 0 ? (
            <div className="flex-1 px-3 py-3 text-[11px] text-zinc-500">
              Click the link icon next to a field to bind a param.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <div className="space-y-2 pr-1">
                {entries.map(([name, entry]) => (
                  <ParamRow
                    key={name}
                    name={name}
                    entry={entry}
                    value={draftValues[name]}
                    onChange={(v) => setDraftValue(name, v)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {showPreview ? (
          <div className="flex w-[440px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50">
            <div className="min-h-0 flex-1 overflow-hidden">
              <OgSocialPreview
                url={fullUrl}
                imageUrl={imageUrl}
                status={status}
                platform={platform}
                handle={handle}
              />
            </div>
            <PlatformPicker platform={platform} onPlatform={onPlatform} />
          </div>
        ) : null}
      </div>

      {liveUrl ? (
        <OgPreviewActions url={fullUrl} filename={templateSlug} />
      ) : null}
    </>
  );
}
