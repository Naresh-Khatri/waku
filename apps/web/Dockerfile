FROM node:22 AS base

# 1. Prune
FROM base AS pruner
WORKDIR /app
COPY . .
RUN corepack enable
RUN npx turbo prune --scope=@waku/web --docker

# 2. Install & Build
FROM base AS installer
WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN SKIP_ENV_VALIDATION=1 pnpm turbo build --filter=@waku/web...

# 3. Runner
FROM base AS runner
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs nextjs
USER nextjs

COPY --from=installer /app/apps/web/next.config.js .
COPY --from=installer /app/apps/web/package.json .

# Standalone trace ships only what server.js actually loads.
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

ENV HOSTNAME="0.0.0.0"
ENV PORT=5000
EXPOSE 5000

CMD ["node", "apps/web/server.js"]
