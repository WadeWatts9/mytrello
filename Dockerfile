FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/bcrypt ./node_modules/bcrypt

# Persistent data volume for SQLite + uploaded files
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

ENV DATABASE_URL="file:/app/data/dev.db"
ENV PORT=3004
ENV HOSTNAME="0.0.0.0"

# Startup: push schema (creates db if not exists), then start app
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

USER nextjs

EXPOSE 3004

CMD ["./start.sh"]
