#!/bin/sh
set -e

# Asegurar que el directorio de datos persistentes exista y tenga permisos (vital para ZimaOS / CasaOS)
mkdir -p /app/data /app/prisma
chown -R nextjs:nodejs /app/data /app/prisma
chmod 777 /app/data

export DATABASE_URL="${DATABASE_URL:-file:/app/data/dev.db}"

echo "🔄 Initializing / updating database schema with DATABASE_URL=${DATABASE_URL}..."
su-exec nextjs:nodejs env DATABASE_URL="$DATABASE_URL" prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate

echo "🚀 Starting MyTrello on port ${PORT:-3004}..."
exec su-exec nextjs:nodejs env DATABASE_URL="$DATABASE_URL" node server.js
