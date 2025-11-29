"""
Quick fix command to ensure PURCHASE_TYPE lookups are active.

This command ensures that SERVICE and GOOD lookups exist and are active
so they appear in the purchase type dropdown.

Usage:
    python manage.py fix_purchase_type_lookups
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from classifications.models import LookupType, Lookup


class Command(BaseCommand):
    help = 'Ensure PURCHASE_TYPE lookups (SERVICE and GOOD) exist and are active'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Get or create PURCHASE_TYPE lookup type
            purchase_type_type, created = LookupType.objects.get_or_create(
                code='PURCHASE_TYPE',
                defaults={
                    'title': 'Purchase Types',
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS('✓ Created PURCHASE_TYPE lookup type'))
            else:
                if not purchase_type_type.is_active:
                    purchase_type_type.is_active = True
                    purchase_type_type.save()
                    self.stdout.write(self.style.SUCCESS('✓ Activated PURCHASE_TYPE lookup type'))
                else:
                    self.stdout.write(self.style.WARNING('  - PURCHASE_TYPE lookup type already exists and is active'))
            
            # Ensure SERVICE and GOOD lookups exist and are active
            for code, title in [('SERVICE', 'Service'), ('GOOD', 'Good')]:
                lookup, created = Lookup.objects.get_or_create(
                    type=purchase_type_type,
                    code=code,
                    defaults={
                        'title': title,
                        'is_active': True
                    }
                )
                
                if created:
                    self.stdout.write(self.style.SUCCESS(f'✓ Created PURCHASE_TYPE lookup: {code}'))
                else:
                    if not lookup.is_active:
                        lookup.is_active = True
                        lookup.save()
                        self.stdout.write(self.style.SUCCESS(f'✓ Activated PURCHASE_TYPE lookup: {code}'))
                    else:
                        self.stdout.write(self.style.WARNING(f'  - PURCHASE_TYPE lookup {code} already exists and is active'))
            
            self.stdout.write(self.style.SUCCESS('\n✅ PURCHASE_TYPE lookups are ready!'))
            self.stdout.write('   The dropdown should now show "Service" and "Good" options.')






