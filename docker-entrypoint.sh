#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"
mkdir -p /app/data

# Keep successful Prisma output (which includes database paths) out of server logs.
if migration_output=$(./node_modules/.bin/prisma migrate deploy --config prisma7.config.ts 2>&1); then
    printf 'Database migrations deployed.\n'
else
    printf '%s\n' "$migration_output" >&2
    exit 1
fi

exec "$@"
