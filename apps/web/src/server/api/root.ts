import { aiRouter } from "@/server/api/routers/ai";
import { assetRouter } from "@/server/api/routers/asset";
import { creditsRouter } from "@/server/api/routers/credits";
import { meRouter } from "@/server/api/routers/me";
import { templateRouter } from "@/server/api/routers/template";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  ai: aiRouter,
  asset: assetRouter,
  credits: creditsRouter,
  me: meRouter,
  template: templateRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 */
export const createCaller = createCallerFactory(appRouter);
