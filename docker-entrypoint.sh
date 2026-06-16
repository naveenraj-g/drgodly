#!/bin/sh
set -e

echo "[entrypoint] Pushing schema to database..."
prisma db push \
  --schema ./prisma/schema/schema.prisma \
  --skip-generate

echo "[entrypoint] Starting server..."
exec node server.js
