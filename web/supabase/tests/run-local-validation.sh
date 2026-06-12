#!/usr/bin/env bash
# Validates the repo migrations and the sync_journal_entry function against a
# local scratch Postgres (no Supabase needed). Requires postgres 16+ binaries.
#
# Usage: ./run-local-validation.sh [port]
set -euo pipefail

PORT="${1:-5499}"
DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATIONS="$DIR/../migrations"
SCRATCH="$(mktemp -d)"

cleanup() {
  pg_ctl -D "$SCRATCH/data" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$SCRATCH"
}
trap cleanup EXIT

initdb -D "$SCRATCH/data" -U postgres -A trust >/dev/null
pg_ctl -D "$SCRATCH/data" -o "-p $PORT -k $SCRATCH" -l "$SCRATCH/log" start >/dev/null
createdb -h "$SCRATCH" -p "$PORT" -U postgres scratch

psql -q -v ON_ERROR_STOP=1 -h "$SCRATCH" -p "$PORT" -U postgres -d scratch \
  -f "$DIR/supabase-stub.sql" \
  $(ls "$MIGRATIONS"/*.sql | sort | sed 's/^/-f /')

echo "migrations applied cleanly"

psql -v ON_ERROR_STOP=1 -h "$SCRATCH" -p "$PORT" -U postgres -d scratch \
  -f "$DIR/sync-entry-functional-test.sql"

echo "functional tests passed"
