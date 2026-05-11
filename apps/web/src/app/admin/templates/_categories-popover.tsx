"use client";

import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/trpc/react";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "category";

const inputCls =
  "rounded-md border border-[#1f2937] bg-[#0b0f1a] px-2.5 py-1.5 text-sm text-[#e5e7eb] focus:border-[#7c5cff] focus:outline-none";

type Props = {
  value?: string | null;
  onChange?: (id: string | null) => void;
};

export function CategoriesPopover({ value, onChange }: Props = {}) {
  const utils = api.useUtils();
  const list = api.admin.categoryList.useQuery();

  const invalidate = () => void utils.admin.categoryList.invalidate();

  const create = api.admin.categoryCreate.useMutation({
    onSuccess: () => {
      setNewName("");
      setNewSlug("");
      invalidate();
    },
    onError: (err) => setError(err.message),
  });
  const update = api.admin.categoryUpdate.useMutation({
    onSettled: invalidate,
    onError: (err) => setError(err.message),
  });
  const del = api.admin.categoryDelete.useMutation({ onSettled: invalidate });

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newName) {
      setError("name required");
      return;
    }
    create.mutate({
      slug: slugify(newSlug || newName),
      name: newName,
      sortOrder: (list.data?.length ?? 0) * 10,
    });
  };

  const cats = list.data ?? [];
  const selectable = !!onChange;
  const selected = cats.find((c) => c.id === value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {selectable ? (
          <button
            type="button"
            className={`${inputCls} flex w-full items-center justify-between text-left`}
          >
            <span className={selected ? "" : "text-[#6b7280]"}>
              {selected ? selected.name : "— none —"}
            </span>
            <span className="ml-2 text-[#6b7280]">▾</span>
          </button>
        ) : (
          <button
            type="button"
            className="rounded-md border border-[#1f2937] px-3 py-1.5 text-sm text-[#d1d5db] hover:border-[#374151]"
          >
            Categories
            {cats.length > 0 ? (
              <span className="ml-2 rounded-full bg-[#111827] px-1.5 py-0.5 text-[10px] text-[#9ca3af]">
                {cats.length}
              </span>
            ) : null}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] min-w-[360px] border-[#1f2937] bg-[#0b0f1a] p-3 text-[#e5e7eb] shadow-2xl"
      >
        <div className="flex flex-col gap-3">
          <form onSubmit={onCreate} className="flex items-end gap-2">
            <div className="flex w-8 flex-1 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-[#9ca3af]">
                Name
              </span>
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (!newSlug) setNewSlug(slugify(e.target.value));
                }}
                placeholder="Marketing"
                className={inputCls}
              />
            </div>
            <div className="flex w-24 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-[#9ca3af]">
                Slug
              </span>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="marketing"
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-md bg-[#7c5cff] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6b4be0] disabled:opacity-40"
            >
              Add
            </button>
          </form>

          {error ? (
            <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-2 py-1 text-xs text-[#fca5a5]">
              {error}
            </div>
          ) : null}

          <div className="max-h-72 overflow-y-auto rounded-md border border-[#1f2937]">
            {list.isLoading ? (
              <div className="px-3 py-4 text-sm text-[#9ca3af]">Loading…</div>
            ) : cats.length === 0 ? (
              <div className="px-3 py-4 text-sm text-[#9ca3af]">
                No categories yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#1f2937]">
                {selectable ? (
                  <li
                    onClick={() => onChange?.(null)}
                    className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-[#0b0f1a] ${
                      value == null ? "text-[#a78bfa]" : "text-[#9ca3af]"
                    }`}
                  >
                    <span>— none —</span>
                    {value == null ? <span>✓</span> : null}
                  </li>
                ) : null}
                {cats.map((c) => (
                  <CategoryRow
                    key={c.id}
                    cat={c}
                    selected={selectable && c.id === value}
                    onSelect={selectable ? () => onChange?.(c.id) : undefined}
                    onSave={(patch) => update.mutate({ id: c.id, ...patch })}
                    onDelete={() => {
                      if (!confirm(`Delete category "${c.name}"?`)) return;
                      del.mutate({ id: c.id });
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CategoryRow({
  cat,
  selected,
  onSelect,
  onSave,
  onDelete,
}: {
  cat: { id: string; slug: string; name: string; sortOrder: number };
  selected?: boolean;
  onSelect?: () => void;
  onSave: (patch: { name?: string; slug?: string }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [slug, setSlug] = useState(cat.slug);
  const dirty = name !== cat.name || slug !== cat.slug;

  if (editing) {
    return (
      <li className="flex items-center gap-2 px-2 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputCls} flex-1`}
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className={`${inputCls} w-28 font-mono text-xs`}
        />
        <button
          disabled={!dirty}
          onClick={() => {
            onSave({ name, slug: slugify(slug) });
            setEditing(false);
          }}
          className="rounded-md bg-[#7c5cff] px-2 py-1 text-xs text-white hover:bg-[#6b4be0] disabled:opacity-30"
        >
          Save
        </button>
        <button
          onClick={() => {
            setName(cat.name);
            setSlug(cat.slug);
            setEditing(false);
          }}
          className="rounded-md border border-[#1f2937] px-2 py-1 text-xs text-[#9ca3af] hover:border-[#374151]"
        >
          ✕
        </button>
      </li>
    );
  }

  return (
    <li
      onClick={onSelect}
      className={`group flex items-center gap-2 px-3 py-2 text-sm ${
        onSelect ? "cursor-pointer hover:bg-[#0b0f1a]" : ""
      } ${selected ? "text-[#a78bfa]" : "text-[#e5e7eb]"}`}
    >
      <span className="flex-1 truncate">{cat.name}</span>
      <span className="font-mono text-xs text-[#6b7280]">{cat.slug}</span>
      {selected ? <span className="text-xs">✓</span> : null}
      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className="rounded-md border border-[#1f2937] px-2 py-0.5 text-xs text-[#9ca3af] hover:border-[#374151]"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-md border border-rose-900/60 px-2 py-0.5 text-xs text-rose-300 hover:border-rose-700"
        >
          Del
        </button>
      </div>
    </li>
  );
}
