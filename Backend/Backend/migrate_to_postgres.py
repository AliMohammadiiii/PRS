#!/usr/bin/env python
"""
Script to migrate data from SQLite to PostgreSQL.

Usage:
    # Step 1: Export from SQLite (run this first)
    python migrate_to_postgres.py export

    # Step 2: Set up PostgreSQL and import (run this after setting DATABASE_URL)
    python migrate_to_postgres.py import
"""
import os
import sys
import logging
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfowise.settings')
django.setup()

from django.core.management import call_command
from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)

def export_from_sqlite():
    """Export data from SQLite database."""
    # Force SQLite connection
    db_url = f'sqlite:///{settings.BASE_DIR / "db.sqlite3"}'
    os.environ['DATABASE_URL'] = db_url
    
    # Reload settings to use SQLite
    from django.conf import settings
    settings.DATABASES['default'] = settings._db_from_url(db_url)
    
    logger.info("Exporting data from SQLite...")
    try:
        # Exclude some tables that cause issues or are auto-generated
        call_command(
            'dumpdata',
            '--exclude', 'auth.permission',
            '--exclude', 'contenttypes',
            '--exclude', 'admin.logentry',
            '--natural-foreign',
            '--natural-primary',
            output='data.json',
            verbosity=2
        )
        logger.info("Data exported successfully to data.json")
        return True
    except Exception as e:
        logger.error(f"Export failed: {e}")
        return False

def import_to_postgres():
    """Import data into PostgreSQL database."""
    db_url = os.environ.get('DATABASE_URL')
    if not db_url or 'sqlite' in db_url:
        logger.error("Error: DATABASE_URL must be set to a PostgreSQL connection string")
        logger.error("  Example: export DATABASE_URL=postgres://user:pass@localhost:5432/cfowise")
        return False
    
    logger.info(f"Importing data to PostgreSQL ({db_url.split('@')[-1] if '@' in db_url else 'unknown'})...")
    
    # Check if database exists and has tables
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM information_schema.tables WHERE table_name = 'django_migrations'")
            has_tables = cursor.fetchone() is not None
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")
        logger.error("  Make sure PostgreSQL is running and migrations have been applied")
        return False
    
    if not has_tables:
        logger.error("Error: Database tables don't exist. Please run migrations first:")
        logger.error("  python manage.py migrate")
        return False
    
    if not os.path.exists('data.json'):
        logger.error("Error: data.json not found. Run 'export' first.")
        return False
    
    try:
        call_command('loaddata', 'data.json', verbosity=2)
        logger.info("Data imported successfully")
        return True
    except Exception as e:
        logger.error(f"Import failed: {e}")
        return False

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    if len(sys.argv) < 2:
        logger.error(__doc__)
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == 'export':
        success = export_from_sqlite()
    elif command == 'import':
        success = import_to_postgres()
    else:
        logger.error(f"Unknown command: {command}")
        logger.error(__doc__)
        sys.exit(1)
    
    sys.exit(0 if success else 1)

