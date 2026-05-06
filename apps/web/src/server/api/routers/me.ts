import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const meRouter = createTRPCRouter({
  current: protectedProcedure.query(({ ctx }) => ({
    id: ctx.session.user.id,
    name: ctx.session.user.name,
    email: ctx.session.user.email,
  })),
});
