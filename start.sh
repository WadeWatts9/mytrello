#!/bin/sh
set -e

# Asegurar permisos correctos en el directorio persistente (para ZimaOS / CasaOS)
mkdir -p /app/data
chown -R nextjs:nodejs /app/data

echo "🔄 Initializing / updating database schema..."
su-exec nextjs:nodejs prisma db push --schema=./prisma/schema.prisma --accept-data-loss

echo "🚀 Starting MyTrello on port ${PORT:-3004}..."
exec su-exec nextjs:nodejs node server.js
