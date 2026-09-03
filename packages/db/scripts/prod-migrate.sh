#!/usr/bin/env bash
# Read-only inspection of a production database. Apply is no longer done here:
# the API container runs `packages/db/src/migrate.ts` on start.
#
# Reads the URL from the commented line 2 of packages/db/.env so the password
# never appears on a command line or in shell history.
#
# Usage:
#   bash scripts/prod-migrate.sh check
set -euo pipefail

cd "$(dirname "$0")/.."

PROD_URL=$(grep -m1 '^# DATABASE_URL=' .env | sed 's/^# DATABASE_URL="\{0,1\}//; s/"$//')
if [[ -z "$PROD_URL" ]]; then
  echo "error: no commented prod DATABASE_URL found on line 2 of .env" >&2
  exit 1
fi

case "${1:-}" in
  check)
    echo "== applied migrations on prod =="
    psql "$PROD_URL" -c "SELECT id, created_at, left(hash,12) AS hash FROM drizzle.__drizzle_migrations ORDER BY id;" \
      || echo "(no drizzle migrations table — prod may have been created with push)"
    echo "== pages columns on prod =="
    psql "$PROD_URL" -tc "SELECT column_name FROM information_schema.columns WHERE table_name='pages' ORDER BY ordinal_position;" | tr -d ' ' | paste -sd, -
    echo "== local journal =="
    python3 -c "import json; [print(e['idx'], e['tag']) for e in json.load(open('drizzle/meta/_journal.json'))['entries']]"
    ;;
  apply)
    echo "error: apply is performed by the API container entrypoint, not this script" >&2
    exit 1
    ;;
  *)
    echo "usage: $0 check" >&2
    exit 1
    ;;
esac
