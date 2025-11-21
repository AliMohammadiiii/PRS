#!/bin/bash
# Script to run migrations in the correct order for PostgreSQL

set -e

echo "=== Running Django Migrations for PostgreSQL ==="
echo ""

# Step 1: Run contenttypes and auth first (these don't depend on custom apps)
echo "Step 1: Running core Django migrations..."
python manage.py migrate contenttypes
python manage.py migrate auth

# Step 2: Run custom app migrations that don't depend on accounts
echo ""
echo "Step 2: Running custom app migrations (excluding accounts and admin)..."
python manage.py migrate classifications
python manage.py migrate org
python manage.py migrate periods
python manage.py migrate core
python manage.py migrate audit

# Step 3: Run accounts migration (creates User model)
echo ""
echo "Step 3: Running accounts migration (creates User model)..."
python manage.py migrate accounts

# Step 4: Now run admin and sessions (they depend on accounts)
echo ""
echo "Step 4: Running admin and sessions migrations..."
python manage.py migrate admin
python manage.py migrate sessions

# Step 5: Run remaining app migrations
echo ""
echo "Step 5: Running remaining app migrations..."
python manage.py migrate reports
python manage.py migrate submissions

# Step 6: Run any remaining migrations
echo ""
echo "Step 6: Running any remaining migrations..."
python manage.py migrate

echo ""
echo "✓ All migrations completed successfully!"

