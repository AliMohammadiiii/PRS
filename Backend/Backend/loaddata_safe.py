#!/usr/bin/env python
"""
Safe data loader that handles duplicate key errors by updating existing records.
"""
import json
import sys
import os
import logging
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfowise.settings')
django.setup()

from django.core import serializers
from django.db import transaction
from django.db.utils import IntegrityError
from io import StringIO

logger = logging.getLogger(__name__)

def loaddata_safe(fixture_file):
    """Load fixture data, updating existing records instead of failing on duplicates."""
    with open(fixture_file, 'r') as f:
        data = json.load(f)
    
    objects_created = 0
    objects_updated = 0
    objects_skipped = 0
    errors = []
    
    with transaction.atomic():
        for obj_data in data:
            try:
                # Get the model
                app_label = obj_data['model'].split('.')[0]
                model_name = obj_data['model'].split('.')[1]
                model = django.apps.apps.get_model(app_label, model_name)
                
                # Get natural key fields if available
                pk = obj_data.get('pk')
                fields = obj_data.get('fields', {})
                
                # Try to find existing object by primary key
                try:
                    existing = model.objects.get(pk=pk)
                    # Update existing object
                    for field_name, value in fields.items():
                        # Handle foreign keys and many-to-many
                        field = model._meta.get_field(field_name)
                        if isinstance(field, django.db.models.ForeignKey):
                            # Foreign key - value is the pk
                            related_model = field.related_model
                            try:
                                related_obj = related_model.objects.get(pk=value)
                                setattr(existing, field_name, related_obj)
                            except related_model.DoesNotExist:
                                pass  # Skip if related object doesn't exist
                        elif isinstance(field, django.db.models.ManyToManyField):
                            # Many-to-many - skip for now, handle separately if needed
                            pass
                        else:
                            setattr(existing, field_name, value)
                    existing.save()
                    objects_updated += 1
                except model.DoesNotExist:
                    # Create new object
                    # Handle foreign keys
                    obj_dict = {}
                    m2m_data = {}
                    
                    for field_name, value in fields.items():
                        field = model._meta.get_field(field_name)
                        if isinstance(field, django.db.models.ForeignKey):
                            related_model = field.related_model
                            try:
                                related_obj = related_model.objects.get(pk=value)
                                obj_dict[field_name] = related_obj
                            except related_model.DoesNotExist:
                                # Skip if related object doesn't exist
                                pass
                        elif isinstance(field, django.db.models.ManyToManyField):
                            m2m_data[field_name] = value
                        else:
                            obj_dict[field_name] = value
                    
                    # Create the object
                    obj = model.objects.create(pk=pk, **obj_dict)
                    
                    # Handle many-to-many relationships
                    for field_name, value_list in m2m_data.items():
                        field = model._meta.get_field(field_name)
                        related_model = field.related_model
                        related_objs = []
                        for pk_value in value_list:
                            try:
                                related_obj = related_model.objects.get(pk=pk_value)
                                related_objs.append(related_obj)
                            except related_model.DoesNotExist:
                                pass
                        getattr(obj, field_name).set(related_objs)
                    
                    objects_created += 1
                    
            except IntegrityError as e:
                # Try to find by unique constraint instead
                try:
                    # For classifications, try to find by code
                    if app_label == 'classifications' and model_name == 'LookupType':
                        existing = model.objects.get(code=fields.get('code'))
                        objects_skipped += 1
                        continue
                    elif app_label == 'classifications' and model_name == 'Lookup':
                        # Find by type and code
                        type_obj = django.apps.apps.get_model('classifications', 'LookupType').objects.get(pk=fields.get('type'))
                        existing = model.objects.get(type=type_obj, code=fields.get('code'))
                        objects_skipped += 1
                        continue
                    else:
                        errors.append(f"{obj_data['model']} (pk={pk}): {str(e)}")
                        objects_skipped += 1
                except (model.DoesNotExist, django.core.exceptions.ObjectDoesNotExist):
                    errors.append(f"{obj_data['model']} (pk={pk}): {str(e)}")
                    objects_skipped += 1
            except Exception as e:
                errors.append(f"{obj_data['model']} (pk={pk}): {str(e)}")
                objects_skipped += 1
    
    logger.info(f"Loaded {objects_created} new objects")
    logger.info(f"Updated {objects_updated} existing objects")
    if objects_skipped > 0:
        logger.warning(f"Skipped {objects_skipped} objects")
    if errors:
        logger.error(f"Errors ({len(errors)}):")
        for error in errors[:10]:  # Show first 10 errors
            logger.error(f"  - {error}")
        if len(errors) > 10:
            logger.error(f"  ... and {len(errors) - 10} more errors")
    
    return objects_created + objects_updated

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    if len(sys.argv) < 2:
        logger.error("Usage: python loaddata_safe.py <fixture_file>")
        sys.exit(1)
    
    fixture_file = sys.argv[1]
    if not os.path.exists(fixture_file):
        logger.error(f"Error: File not found: {fixture_file}")
        sys.exit(1)
    
    logger.info(f"Loading data from {fixture_file}...")
    count = loaddata_safe(fixture_file)
    logger.info(f"Successfully processed {count} objects")

