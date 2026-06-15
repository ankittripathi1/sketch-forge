# Build context MUST be the repo root (so bun workspace @repo/* deps resolve).
FROM oven/bun:1.3.13 AS builder
WORKDIR /app

# Copy the whole monorepo and install all workspace deps.
COPY . .
RUN bun install --frozen-lockfile

# Bundle the API into a single dist/index.js (bun --target=bun).
RUN bun run build --filter=api

# --- Runtime: only the bundled output is needed ---
FROM oven/bun:1.3.13-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4001
COPY --from=builder /app/apps/api/dist ./dist
EXPOSE 4001
CMD ["bun", "dist/index.js"]
