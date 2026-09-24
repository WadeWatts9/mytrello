#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma db push --schema=./prisma/schema.prisma

echo "🚀 Starting MyTrello on port 3004..."
exec node server.js
