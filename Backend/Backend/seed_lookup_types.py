#!/usr/bin/env python
"""Manually seed PRS lookup types"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cfowise.settings')
django.setup()

from classifications.models import LookupType, Lookup

# Create REQUEST_STATUS lookup type
request_status_type, _ = LookupType.objects.get_or_create(
    code='REQUEST_STATUS',
    defaults={'title': 'Request Statuses'}
)

# Create PURCHASE_TYPE lookup type
purchase_type_type, _ = LookupType.objects.get_or_create(
    code='PURCHASE_TYPE',
    defaults={'title': 'Purchase Types'}
)

def add_lookup(lookup_type, code, title):
    Lookup.objects.get_or_create(
        type=lookup_type,
        code=code,
        defaults={'title': title}
    )

# REQUEST_STATUS values
add_lookup(request_status_type, 'DRAFT', 'Draft')
add_lookup(request_status_type, 'PENDING_APPROVAL', 'Pending Approval')
add_lookup(request_status_type, 'IN_REVIEW', 'In Review')
add_lookup(request_status_type, 'REJECTED', 'Rejected')
add_lookup(request_status_type, 'RESUBMITTED', 'Resubmitted')
add_lookup(request_status_type, 'FULLY_APPROVED', 'Fully Approved')
add_lookup(request_status_type, 'FINANCE_REVIEW', 'Finance Review')
add_lookup(request_status_type, 'COMPLETED', 'Completed')
add_lookup(request_status_type, 'ARCHIVED', 'Archived')

# PURCHASE_TYPE values
add_lookup(purchase_type_type, 'SERVICE', 'Service')
add_lookup(purchase_type_type, 'GOOD', 'Good')

print("✓ Successfully seeded PRS lookup types!")


