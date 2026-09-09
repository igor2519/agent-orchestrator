# Build context is the monorepo root, not this directory:
#   docker build -f apps/ocr-service/Dockerfile -t <repo>:<sha> .
#
# `turbo prune` reduces the workspace to this app and the packages it actually
# depends on, so the installer layer only rebuilds when those manifests change -
# not on every edit anywhere in the repo.

FROM node:24-alpine AS pruner
WORKDIR /repo
RUN yarn global add turbo@2.10.12
COPY . .
RUN turbo prune ocr-service --docker

FROM node:24-alpine AS installer
WORKDIR /repo
# Manifests first: this layer is cached until a package.json or the lockfile moves.
COPY --from=pruner /repo/out/json/ ./
COPY --from=pruner /repo/out/yarn.lock ./yarn.lock
RUN yarn install --frozen-lockfile --network-timeout 600000

FROM installer AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/full/ ./
RUN yarn turbo run build --filter=ocr-service
# Drop dev dependencies now that the build is done; they must not ship.
RUN yarn install --frozen-lockfile --production --ignore-scripts --prefer-offline

FROM node:24-alpine AS runner
WORKDIR /repo

# Fargate runs the container as whatever the image says. Do not leave that as root.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nodejs -G nodejs

ENV NODE_ENV=production

COPY --from=builder --chown=nodejs:nodejs /repo/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /repo/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /repo/apps/ocr-service/node_modules ./apps/ocr-service/node_modules
COPY --from=builder --chown=nodejs:nodejs /repo/apps/ocr-service/dist ./apps/ocr-service/dist
COPY --from=builder --chown=nodejs:nodejs /repo/apps/ocr-service/package.json ./apps/ocr-service/package.json

USER nodejs
WORKDIR /repo/apps/ocr-service
CMD ["node", "dist/main"]
