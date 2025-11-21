from django.db import migrations


def add_draft_status(apps, schema_editor):
    LookupType = apps.get_model('classifications', 'LookupType')
    Lookup = apps.get_model('classifications', 'Lookup')
    
    try:
        report_status_type = LookupType.objects.get(code='REPORT_STATUS')
        Lookup.objects.get_or_create(
            type=report_status_type,
            code='DRAFT',
            defaults={'title': 'Draft'}
        )
    except LookupType.DoesNotExist:
        # If REPORT_STATUS type doesn't exist, skip
        pass


def remove_draft_status(apps, schema_editor):
    LookupType = apps.get_model('classifications', 'LookupType')
    Lookup = apps.get_model('classifications', 'Lookup')
    
    try:
        report_status_type = LookupType.objects.get(code='REPORT_STATUS')
        Lookup.objects.filter(type=report_status_type, code='DRAFT').delete()
    except LookupType.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('classifications', '0002_seed_initial'),
    ]

    operations = [
        migrations.RunPython(add_draft_status, remove_draft_status),
    ]






