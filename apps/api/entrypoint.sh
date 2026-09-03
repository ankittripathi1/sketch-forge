#!/bin/sh
# Apply the SQL baseline, then serve the API.
# The migrator reads files from disk; it is not baked into dist/index.js.
set -e
bun /app/migrate.js
exec bun /app/dist/index.js
