#!/usr/bin/env python
"""
Smart data loader that:
1. Handles duplicate classifications data (skips if exists)
2. Handles missing foreign keys (skips records with missing FKs)
3. Loads data in dependency order
"""
import json
import sys
import os
import logging
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfowise.settings')
django.setup()

from django.db import transaction
from django.db.utils import IntegrityError
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

def loaddata_smart(fixture_file):
    """Load fixture data with smart duplicate and FK handling."""
    with open(fixture_file, 'r') as f:
        data = json.load(f)
    
    # Group data by model for dependency-aware loading
    by_model = {}
    for obj_data in data:
        model_key = obj_data['model']
        if model_key not in by_model:
            by_model[model_key] = []
        by_model[model_key].append(obj_data)
    
    # Define load order (dependencies first)
    load_order = [
        'classifications.lookuptype',
        'classifications.lookup',
        'auth.group',
        'auth.permission',
        'accounts.user',
        'org.orgnode',
        'periods.financialperiod',
        'reports.reportbox',
        'reports.reportfield',
        'accounts.accessscope',
        'submissions.submission',
        'submissions.submissionfieldvalue',
        'audit.auditevent',
        'audit.fieldchange',
    ]
    
    # Add any models not in the order list
    for model_key in by_model.keys():
        if model_key not in load_order:
            load_order.append(model_key)
    
    objects_created = 0
    objects_skipped = 0
    errors = []
    
    with transaction.atomic():
        for model_key in load_order:
            if model_key not in by_model:
                continue
            
            app_label, model_name = model_key.split('.')
            try:
                model = django.apps.apps.get_model(app_label, model_name)
            except LookupError:
                continue
            
            logger.info(f"Loading {model_key}...")
            
            for obj_data in by_model[model_key]:
                try:
                    pk = obj_data.get('pk')
                    fields = obj_data.get('fields', {})
                    
                    # Check if object already exists (especially for classifications)
                    try:
                        existing = model.objects.get(pk=pk)
                        objects_skipped += 1
                        continue
                    except model.DoesNotExist:
                        pass
                    
                    # For classifications, also check by unique fields
                    if app_label == 'classifications':
                        if model_name == 'LookupType':
                            # Check by code
                            code = fields.get('code')
                            if code and model.objects.filter(code=code).exists():
                                objects_skipped += 1
                                continue
                        elif model_name == 'Lookup':
                            # Check by type and code
                            type_pk = fields.get('type')
                            code = fields.get('code')
                            if type_pk and code:
                                try:
                                    type_obj = django.apps.apps.get_model('classifications', 'LookupType').objects.get(pk=type_pk)
                                    if model.objects.filter(type=type_obj, code=code).exists():
                                        objects_skipped += 1
                                        continue
                                except:
                                    pass
                    
                    # Build object data, checking foreign keys exist
                    obj_dict = {}
                    m2m_data = {}
                    skip_obj = False
                    
                    for field_name, value in fields.items():
                        try:
                            field = model._meta.get_field(field_name)
                            
                            if isinstance(field, django.db.models.ForeignKey):
                                # Check if foreign key object exists
                                related_model = field.related_model
                                try:
                                    related_obj = related_model.objects.get(pk=value)
                                    obj_dict[field_name] = related_obj
                                except related_model.DoesNotExist:
                                    # Skip this object if FK doesn't exist
                                    skip_obj = True
                                    break
                            
                            elif isinstance(field, django.db.models.ManyToManyField):
                                # Store for later processing
                                m2m_data[field_name] = value
                            
                            else:
                                obj_dict[field_name] = value
                        except django.db.models.fields.FieldDoesNotExist:
                            # Field doesn't exist, skip it
                            pass
                    
                    if skip_obj:
                        objects_skipped += 1
                        continue
                    
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
                                pass  # Skip missing M2M objects
                        if related_objs:
                            getattr(obj, field_name).set(related_objs)
                    
                    objects_created += 1
                    
                except IntegrityError as e:
                    # Handle unique constraint violations
                    if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                        objects_skipped += 1
                    else:
                        errors.append(f"{model_key} (pk={pk}): {str(e)}")
                        objects_skipped += 1
                except Exception as e:
                    errors.append(f"{model_key} (pk={pk}): {str(e)}")
                    objects_skipped += 1
    
    logger.info(f"Created {objects_created} objects")
    if objects_skipped > 0:
        logger.warning(f"Skipped {objects_skipped} objects (duplicates or missing FKs)")
    if errors:
        logger.error(f"Errors ({len(errors)}):")
        for error in errors[:10]:
            logger.error(f"  - {error}")
        if len(errors) > 10:
            logger.error(f"  ... and {len(errors) - 10} more")
    
    return objects_created

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    if len(sys.argv) < 2:
        logger.error("Usage: python loaddata_smart.py <fixture_file>")
        sys.exit(1)
    
    fixture_file = sys.argv[1]
    if not os.path.exists(fixture_file):
        logger.error(f"Error: File not found: {fixture_file}")
        sys.exit(1)
    
    logger.info(f"Loading data from {fixture_file}...")
    count = loaddata_smart(fixture_file)
    logger.info(f"Successfully loaded {count} objects")

