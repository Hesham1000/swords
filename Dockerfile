FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

# --- Development Stage ---
# This stage is used locally via docker-compose
FROM base AS development
COPY . .
ENV NODE_ENV=development
EXPOSE 3000
CMD ["yarn", "dev"]

# --- Production Builder Stage ---
# This stage builds the app for production
FROM base AS builder
COPY . .
# Ensure telemetry is disabled during build
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# --- Production Runner Stage ---
# This is the final target for Render.com
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["yarn", "start"]