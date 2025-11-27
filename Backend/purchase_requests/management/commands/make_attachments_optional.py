"""
Quick fix command to make all attachment categories optional for a team.

This is useful for test scenarios where attachments shouldn't be required.

Usage:
    python manage.py make_attachments_optional --team "Marketing"
    python manage.py make_attachments_optional --team-id <UUID>
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from attachments.models import AttachmentCategory
from teams.models import Team


class Command(BaseCommand):
    help = 'Make all attachment categories optional for a team'

    def add_arguments(self, parser):
        parser.add_argument(
            '--team',
            type=str,
            help='Team name to update attachment categories for',
        )
        parser.add_argument(
            '--team-id',
            type=str,
            help='Team UUID to update attachment categories for',
        )

    def handle(self, *args, **options):
        team_name = options.get('team')
        team_id = options.get('team_id')

        if not team_name and not team_id:
            self.stdout.write(self.style.ERROR('Please provide either --team or --team-id'))
            return

        with transaction.atomic():
            try:
                if team_id:
                    team = Team.objects.get(id=team_id, is_active=True)
                else:
                    team = Team.objects.get(name=team_name, is_active=True)
            except Team.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Team not found: {team_name or team_id}'))
                return

            # Get all active attachment categories for this team
            categories = AttachmentCategory.objects.filter(team=team, is_active=True, required=True)
            
            if not categories.exists():
                self.stdout.write(self.style.WARNING(f'No required attachment categories found for team "{team.name}"'))
                return

            updated_count = 0
            for category in categories:
                category.required = False
                category.save()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ Made "{category.name}" optional'))

            self.stdout.write(self.style.SUCCESS(f'\n✅ Updated {updated_count} attachment category/categories for team "{team.name}"'))
            self.stdout.write('   You can now submit requests without attachments.')




