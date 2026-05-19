import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";

import { env } from "@/env";
import { db } from "@/server/db";

import { markLinkFailed, migrateAnonData, recordLinkIntent } from "./anon-link";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    additionalFields: {
      // Surfaced on session.user — set manually in the DB. Never user-writable.
      isAdmin: {
        type: "boolean",
        input: false,
        defaultValue: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    anonymous({
      // We own anon-user deletion (inside migrateAnonData's transaction) so
      // a failed migration never destroys guest work. Verified against
      // better-auth 1.6.9: with this set, the plugin never auto-deletes.
      disableDeleteAnonymousUser: true,
      generateName: () => "Guest",
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        const fromId = anonymousUser.user.id;
        const toId = newUser.user.id;
        // Fires even on the isSameUser / still-anonymous paths — both are
        // no-ops we must skip before recording intent or deleting anything.
        if (fromId === toId || newUser.user.isAnonymous) return;
        await recordLinkIntent(fromId, toId);
        try {
          await migrateAnonData(fromId, toId);
        } catch (error) {
          // after-hook fires once and can't roll back the new account;
          // leave it to the reconcile cron rather than failing the sign-in.
          await markLinkFailed(fromId, error);
        }
      },
    }),
    // nextCookies MUST stay last.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
