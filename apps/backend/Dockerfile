# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci -w backend

COPY apps/backend/nest-cli.json apps/backend/tsconfig.json apps/backend/tsconfig.build.json ./apps/backend/
COPY apps/backend/scripts ./apps/backend/scripts
COPY apps/backend/src ./apps/backend/src

RUN npm run build -w backend

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci --omit=dev -w backend && npm cache clean --force

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "apps/backend/dist/main.js"]
