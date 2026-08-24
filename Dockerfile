FROM node:26.7.0-alpine AS builder

COPY --from=oven/bun:1.3.14-alpine /usr/local/bin/bun /usr/local/bin/bun
COPY . /app
COPY tsconfig.json /tsconfig.json

WORKDIR /app

RUN --mount=type=cache,target=/root/.bun/install/cache bun ci

FROM node:26.7.0-alpine AS release

COPY --from=oven/bun:1.3.14-alpine /usr/local/bin/bun /usr/local/bin/bun
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/bun.lock /app/bun.lock

ENV NODE_ENV=production

WORKDIR /app

RUN --mount=type=cache,target=/root/.bun/install/cache bun ci --production --ignore-scripts

ENTRYPOINT ["node", "dist/index.js"]
