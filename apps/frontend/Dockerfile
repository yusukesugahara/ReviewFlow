# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci --legacy-peer-deps

FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY --from=deps /app/apps/frontend/package.json ./apps/frontend/package.json
COPY apps/frontend ./apps/frontend

RUN mkdir -p apps/frontend/public

ARG NEXT_PUBLIC_API_URL
ARG INTERNAL_API_KEY
ARG INTERNAL_API_ORIGIN
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV INTERNAL_API_KEY=${INTERNAL_API_KEY}
ENV INTERNAL_API_ORIGIN=${INTERNAL_API_ORIGIN}

RUN npm run build -w frontend

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs

EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
