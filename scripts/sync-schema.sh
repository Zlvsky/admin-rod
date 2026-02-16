#!/bin/bash

# Sync Prisma schema from the main backend repository
# Usage: ./scripts/sync-schema.sh [path-to-backend]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default backend path (sibling directory)
BACKEND_PATH="${1:-/Users/zlvsky/gites/realm-of-dungeons-backend}"

SOURCE_SCHEMA="$BACKEND_PATH/prisma/schema.prisma"
DEST_SCHEMA="$PROJECT_ROOT/prisma/schema.prisma"

if [ ! -f "$SOURCE_SCHEMA" ]; then
    echo "❌ Error: Source schema not found at $SOURCE_SCHEMA"
    echo "Usage: ./scripts/sync-schema.sh [path-to-backend]"
    exit 1
fi

# Backup existing schema
if [ -f "$DEST_SCHEMA" ]; then
    cp "$DEST_SCHEMA" "$DEST_SCHEMA.backup"
    echo "📦 Backed up existing schema to schema.prisma.backup"
fi

# Copy schema
cp "$SOURCE_SCHEMA" "$DEST_SCHEMA"
echo "✅ Schema copied from $SOURCE_SCHEMA"

# Regenerate Prisma client
cd "$PROJECT_ROOT"
npx prisma generate
echo "✅ Prisma client regenerated"

echo ""
echo "🎉 Schema sync complete!"
