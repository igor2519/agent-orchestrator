# Build context is the monorepo root, not this directory:
#   docker build -f apps/frontend/Dockerfile -t <repo>:<sha> .
#
# Building the frontend also builds the API and regenerates the typed client from
# its OpenAPI spec (see turbo.json: frontend#build depends on
# api-client#gen:api-client). That generator boots the Nest app with
# NODE_ENV=api-client, which swaps Postgres for an in-memory better-sqlite3
# database and never contacts RabbitMQ - so the whole chain runs inside a builder
# with no network services. Verified: it exits 0 with both unreachable.

FROM node:24-alpine AS pruner
WORKDIR /repo
RUN yarn global add turbo@2.10.12
COPY . .
# api-client is generated rather than committed, so the API has to come along.
RUN turbo prune frontend api --docker

FROM node:24-alpine AS installer
WORKDIR /repo
COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile --network-timeout 600000

FROM installer AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/full/ ./

ENV NEXT_TELEMETRY_DISABLED=1
# Baked into the bundle at build time, so they cannot come from the task
# definition the way server-side variables do.
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_FRONTEND_URL
ARG CDN_BASE_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    NEXT_PUBLIC_FRONTEND_URL=$NEXT_PUBLIC_FRONTEND_URL \
    CDN_BASE_URL=$CDN_BASE_URL

RUN yarn turbo run build --filter=frontend

FROM node:24-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# The standalone output already contains its own traced node_modules, so nothing
# else from the workspace is copied in.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/frontend/public ./apps/frontend/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
