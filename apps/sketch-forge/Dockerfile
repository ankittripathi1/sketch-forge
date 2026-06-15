# Build context MUST be the repo root (so bun workspace @repo/* deps resolve).
FROM oven/bun:1.3.13 AS builder
WORKDIR /app

# NEXT_PUBLIC_* is baked in at BUILD time, so it must be a build arg.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy the whole monorepo and install all workspace deps.
COPY . .
RUN bun install --frozen-lockfile

# Build the Next.js app (turbo also builds its @repo/* deps first).
RUN bun run build --filter=sketch-forge

# --- Runtime: run `next start` from the app dir (needs node_modules + .next) ---
FROM oven/bun:1.3.13 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app ./
WORKDIR /app/apps/sketch-forge
EXPOSE 3000
CMD ["bun", "run", "start"]
