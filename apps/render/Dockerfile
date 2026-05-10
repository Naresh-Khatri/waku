FROM node:23 AS base

# 1. Prune
FROM base AS pruner
WORKDIR /app
COPY . .
RUN corepack enable
RUN npx turbo prune --scope=@waku/render --docker

# 2. Install & Build
FROM base AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN SKIP_ENV_VALIDATION=1 pnpm turbo build --filter=@waku/render...

# 3. Runner — pulls in the standalone bundle plus the native binaries
# (sharp, resvg) that outputFileTracingIncludes maps in next.config.js.
FROM base AS runner
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs
USER nextjs

COPY --from=installer /app/apps/render/next.config.js .
COPY --from=installer /app/apps/render/package.json .

COPY --from=installer --chown=nextjs:nodejs /app/apps/render/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/render/.next/static ./apps/render/.next/static

ENV HOSTNAME="0.0.0.0"
ENV PORT=5001
EXPOSE 5001

CMD ["node", "apps/render/server.js"]
