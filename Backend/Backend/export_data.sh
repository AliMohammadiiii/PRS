#!/bin/bash
# Export data excluding classifications (which are seeded by migrations)

set -e

echo "Exporting data from SQLite (excluding classifications)..."
unset DATABASE_URL

python manage.py dumpdata \
    --exclude auth.permission \
    --exclude contenttypes \
    --exclude admin.logentry \
    --exclude classifications \
    --natural-foreign \
    --natural-primary \
    > data.json

echo "✓ Data exported to data.json (classifications excluded - they're seeded by migrations)"

