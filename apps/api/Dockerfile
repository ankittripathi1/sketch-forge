# Build context MUST be the repo root (so bun workspace @repo/* deps resolve).
FROM oven/bun:1.3.13 AS builder
WORKDIR /app

# Copy the whole monorepo and install all workspace deps.
COPY . .
RUN bun install --frozen-lockfile

# Bundle the API and a migrator that reads SQL files from disk at boot.
RUN bun run build --filter=api
RUN bun build packages/db/src/migrate.ts --outfile /tmp/migrate.js --target=bun

# --- Runtime ---
FROM oven/bun:1.3.13-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4001
ENV MIGRATIONS_FOLDER=/app/drizzle
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /tmp/migrate.js ./migrate.js
COPY --from=builder /app/packages/db/drizzle ./drizzle
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
EXPOSE 4001
CMD ["./entrypoint.sh"]
