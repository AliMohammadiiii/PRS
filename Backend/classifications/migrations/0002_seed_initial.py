from django.db import migrations


def seed_lookups(apps, schema_editor):
    LookupType = apps.get_model('classifications', 'LookupType')
    Lookup = apps.get_model('classifications', 'Lookup')

    types = {
        'COMPANY_ROLE': 'Company Roles',
        'LEGAL_ENTITY_TYPE': 'Legal Entity Types',
        'INDUSTRY_TYPE': 'Industry Types',
        'SUB_INDUSTRY_TYPE': 'Sub-industry Types',
        'COMPANY_CLASSIFICATION': 'Company Classifications',
        'REPORT_STATUS': 'Report Statuses',
        'REPORTING_PERIOD': 'Reporting Periods',
        'ORG_TYPE': 'Organization Types',
    }

    created_types = {}
    for code, title in types.items():
        lt, _ = LookupType.objects.get_or_create(code=code, defaults={'title': title})
        created_types[code] = lt

    def add(tcode, code, title):
        Lookup.objects.get_or_create(type=created_types[tcode], code=code, defaults={'title': title})

    # Report statuses
    add('REPORT_STATUS', 'DRAFT', 'Draft')
    add('REPORT_STATUS', 'UNDER_REVIEW', 'Under Review')
    add('REPORT_STATUS', 'APPROVED', 'Approved')
    add('REPORT_STATUS', 'REJECTED', 'Rejected')

    # Reporting periods
    add('REPORTING_PERIOD', 'MONTHLY', 'Monthly')
    add('REPORTING_PERIOD', 'FIRST_HALF', 'First Half')
    add('REPORTING_PERIOD', 'ANNUAL', 'Annual')

    # Company roles
    add('COMPANY_ROLE', 'CEO', 'CEO')
    add('COMPANY_ROLE', 'FINANCIAL_EXPERT', 'Financial Expert')
    add('COMPANY_ROLE', 'PRODUCT_DESIGNER', 'Product Designer')

    # Org type
    add('ORG_TYPE', 'HOLDING', 'Holding')
    add('ORG_TYPE', 'COMPANY', 'Company')

    # Legal entity type (examples)
    add('LEGAL_ENTITY_TYPE', 'PUBLIC', 'Public')
    add('LEGAL_ENTITY_TYPE', 'PRIVATE', 'Private')
    add('LEGAL_ENTITY_TYPE', 'MIXED', 'Mixed')

    # Industry examples
    add('INDUSTRY_TYPE', 'BANKING', 'Banking')
    add('INDUSTRY_TYPE', 'IT', 'IT')
    add('INDUSTRY_TYPE', 'AUTOMOTIVE', 'Automotive')

    # Sub-industry examples
    add('SUB_INDUSTRY_TYPE', 'FINTECH', 'Fintech')
    add('SUB_INDUSTRY_TYPE', 'DIGITAL_INSURANCE', 'Digital Insurance')
    add('SUB_INDUSTRY_TYPE', 'ECOMMERCE', 'E-commerce')

    # Company classifications
    add('COMPANY_CLASSIFICATION', 'SERVICE', 'Service')
    add('COMPANY_CLASSIFICATION', 'MANUFACTURING', 'Manufacturing')
    add('COMPANY_CLASSIFICATION', 'BUSINESS', 'Business')
    add('COMPANY_CLASSIFICATION', 'EDUCATIONAL', 'Educational')


class Migration(migrations.Migration):

    dependencies = [
        ('classifications', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_lookups, migrations.RunPython.noop),
    ]
