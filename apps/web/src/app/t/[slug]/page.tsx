import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { env } from "@/env";
import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PublicTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  let stock;
  try {
    stock = await api.template.getPublicStock({ slug });
  } catch {
    notFound();
  }

  const session = await getSession();

  // The "?fork=1" intent is what survives an OAuth round-trip; if we land here
  // with the flag set and a real session, finish the fork and bounce to the
  // editor. Otherwise we just render the preview.
  const wantsFork = sp.fork === "1";
  if (wantsFork && session?.user) {
    const { template } = await api.template.forkFromStock({ stockSlug: slug });
    redirect(`/templates/${template.slug}`);
  }

  const renderParams = stripReservedParams(sp);
  const qs = renderParams.toString();
  const previewUrl = `${env.NEXT_PUBLIC_RENDER_BASE_URL}/r/stock/${stock.slug}${
    qs.length ? `?${qs}` : ""
  }`;

  // Same path + params survive a sign-in round-trip so the post-auth fork lands
  // back here with state intact.
  const editParams = new URLSearchParams(renderParams);
  editParams.set("fork", "1");
  const editReturnUrl = `/t/${stock.slug}?${editParams.toString()}`;

  return (
    <div className="min-h-screen bg-[#030712] text-[#e5e7eb]">
      <header className="border-b border-[#1f2937] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            Waku
          </Link>
          <div className="text-sm text-[#9ca3af]">
            {session?.user ? (
              <Link href="/" className="hover:text-[#e5e7eb]">
                Dashboard
              </Link>
            ) : (
              <span>Preview · sign in to edit</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">{stock.name}</h1>
          {stock.description ? (
            <p className="text-sm text-[#9ca3af]">{stock.description}</p>
          ) : null}
          {stock.category ? (
            <span className="self-start rounded-full border border-[#1f2937] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#9ca3af]">
              {stock.category.name}
            </span>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a]">
          <div className="aspect-[1200/630] w-full">
            <iframe
              src={previewUrl}
              title={`${stock.name} preview`}
              className="h-full w-full"
              sandbox="allow-scripts"
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-[#1f2937] px-4 py-3">
            <code className="min-w-0 truncate font-mono text-[11px] text-[#9ca3af]">
              {previewUrl}
            </code>
            <EditButton
              loggedIn={Boolean(session?.user)}
              stockSlug={stock.slug}
              returnUrl={editReturnUrl}
            />
          </div>
        </div>

        <p className="text-xs text-[#6b7280]">
          Append query string params (e.g. <code>?title=Hello</code>) to
          customize this preview. The same URL works for anyone — share away.
        </p>
      </main>
    </div>
  );
}

function EditButton({
  loggedIn,
  stockSlug,
  returnUrl,
}: {
  loggedIn: boolean;
  stockSlug: string;
  returnUrl: string;
}) {
  if (loggedIn) {
    return (
      <form>
        <button
          type="submit"
          formAction={async () => {
            "use server";
            const { template } = await api.template.forkFromStock({
              stockSlug,
            });
            redirect(`/templates/${template.slug}`);
          }}
          className="rounded-md bg-[#7c5cff] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b4be0]"
        >
          Edit this template
        </button>
      </form>
    );
  }

  return (
    <form>
      <button
        type="submit"
        formAction={async () => {
          "use server";
          const res = await auth.api.signInSocial({
            body: { provider: "github", callbackURL: returnUrl },
          });
          if (!res.url) throw new Error("No URL returned from signInSocial");
          redirect(res.url);
        }}
        className="rounded-md bg-[#7c5cff] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b4be0]"
      >
        Sign in to edit
      </button>
    </form>
  );
}

// fork is our intent flag; everything else is a render param the iframe needs.
function stripReservedParams(sp: SearchParams): URLSearchParams {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key === "fork") continue;
    if (Array.isArray(value)) {
      for (const v of value) out.append(key, v);
    } else if (typeof value === "string") {
      out.append(key, value);
    }
  }
  return out;
}
