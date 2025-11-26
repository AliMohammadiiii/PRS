from django.db import migrations


def add_prs_lookups(apps, schema_editor):
    """Add REQUEST_STATUS and PURCHASE_TYPE lookup types and values for PRS"""
    LookupType = apps.get_model('classifications', 'LookupType')
    Lookup = apps.get_model('classifications', 'Lookup')

    # Create lookup types
    request_status_type, _ = LookupType.objects.get_or_create(
        code='REQUEST_STATUS',
        defaults={'title': 'Request Statuses'}
    )
    
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


def remove_prs_lookups(apps, schema_editor):
    """Remove PRS lookup types and values"""
    LookupType = apps.get_model('classifications', 'LookupType')
    Lookup = apps.get_model('classifications', 'Lookup')

    try:
        request_status_type = LookupType.objects.get(code='REQUEST_STATUS')
        Lookup.objects.filter(type=request_status_type).delete()
        request_status_type.delete()
    except LookupType.DoesNotExist:
        pass

    try:
        purchase_type_type = LookupType.objects.get(code='PURCHASE_TYPE')
        Lookup.objects.filter(type=purchase_type_type).delete()
        purchase_type_type.delete()
    except LookupType.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('classifications', '0003_add_draft_status'),
    ]

    operations = [
        migrations.RunPython(add_prs_lookups, remove_prs_lookups),
    ]


