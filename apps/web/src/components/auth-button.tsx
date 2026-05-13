import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";
import { cn } from "@/lib/utils";

type Props = {
  callbackURL?: string;
  className?: string;
};

export async function AuthButton({ callbackURL = "/", className }: Props) {
  const session = await getSession();

  if (session?.user) {
    return (
      <form>
        <button
          type="submit"
          formAction={async () => {
            "use server";
            await auth.api.signOut({ headers: await headers() });
            redirect("/");
          }}
          className={cn(
            "rounded-full border border-[#1f2937] px-3 py-1 text-xs text-[#9ca3af] transition hover:border-[#7c5cff] hover:text-[#e5e7eb]",
            className,
          )}
        >
          Sign out
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
            body: { provider: "github", callbackURL },
          });
          if (!res.url) throw new Error("No URL returned from signInSocial");
          redirect(res.url);
        }}
        className={cn(
          "rounded-full bg-[#7c5cff] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#6b4be0]",
          className,
        )}
      >
        Sign in
      </button>
    </form>
  );
}
