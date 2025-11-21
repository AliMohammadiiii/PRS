#!/bin/bash
# Script to migrate data from SQLite to PostgreSQL

set -e

echo "=== SQLite to PostgreSQL Migration ==="
echo ""

# Step 1: Export from SQLite
echo "Step 1: Exporting data from SQLite..."
unset DATABASE_URL
python manage.py dumpdata \
    --exclude auth.permission \
    --exclude contenttypes \
    --exclude admin.logentry \
    --natural-foreign \
    --natural-primary \
    > data.json

if [ $? -eq 0 ]; then
    echo "✓ Data exported successfully to data.json"
    echo ""
else
    echo "✗ Export failed"
    exit 1
fi

# Step 2: Check if PostgreSQL is configured
if [ -z "$DATABASE_URL" ]; then
    echo "Step 2: Set DATABASE_URL to your PostgreSQL connection string"
    echo "  Example: export DATABASE_URL=postgres://cfowise:cfowise@localhost:5432/cfowise"
    echo ""
    echo "Then run migrations and import:"
    echo "  python manage.py migrate"
    echo "  python manage.py loaddata data.json"
    exit 0
fi

# Step 3: Run migrations
echo "Step 2: Running migrations on PostgreSQL..."
python manage.py migrate

# Step 4: Import data
echo "Step 3: Importing data to PostgreSQL..."
python manage.py loaddata data.json

if [ $? -eq 0 ]; then
    echo "✓ Migration completed successfully!"
else
    echo "✗ Import failed"
    exit 1
fi

