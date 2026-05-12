import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { SnapshotRow, type Snapshot } from "./snapshot-row";

export function HistoryTab({
  snapshots,
  isLoading,
  buildSnapshotUrl,
  onCreate,
  creating,
  createError,
  restoringId,
  onRestore,
  onRename,
  onDelete,
}: {
  snapshots: Snapshot[] | undefined;
  isLoading: boolean;
  buildSnapshotUrl: (version: number) => string;
  onCreate: () => void;
  creating: boolean;
  createError: string | null;
  restoringId: string | null;
  onRestore: (id: string) => void;
  onRename: (id: string, label: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-4 text-xs text-zinc-400">Loading…</p>
        ) : snapshots && snapshots.length > 0 ? (
          <Accordion
            type="single"
            collapsible
            key={snapshots[0]?.id}
            defaultValue={snapshots[0]?.id}
            className="flex flex-col"
          >
            {snapshots.map((s) => (
              <SnapshotRow
                key={s.id}
                snapshot={s}
                url={buildSnapshotUrl(s.version)}
                restoring={restoringId === s.id}
                onRestore={() => onRestore(s.id)}
                onRename={(label) => onRename(s.id, label)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-xs text-zinc-500">No snapshots yet.</p>
            <p className="text-[11px] text-zinc-400">
              Save one to keep a stable URL while you iterate.
            </p>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-zinc-200 p-3">
        <Button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {creating ? "Saving…" : "+ Save snapshot"}
        </Button>
        {createError ? (
          <p className="mt-2 text-[11px] text-rose-600">{createError}</p>
        ) : null}
      </footer>
    </>
  );
}
