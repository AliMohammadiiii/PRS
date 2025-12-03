from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Quick fix for Django admin login issues - activates user and grants admin permissions"

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            help='Username of the admin user to fix',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Optional: set a new password for the user',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Try case-insensitive search
            users = User.objects.filter(username__iexact=username)
            if users.exists():
                user = users.first()
                self.stdout.write(
                    self.style.WARNING(
                        f'Found user with similar username (case-insensitive): {user.username}'
                    )
                )
            else:
                raise CommandError(
                    f'User "{username}" does not exist.\n'
                    f'To create a new superuser, run: python manage.py createsuperuser'
                )

        # Show current status
        self.stdout.write(self.style.SUCCESS(f'\nCurrent status for user: {user.username}'))
        self.stdout.write(f'  Active: {"✓" if user.is_active else "✗"}')
        self.stdout.write(f'  Staff: {"✓" if user.is_staff else "✗"}')
        self.stdout.write(f'  Superuser: {"✓" if user.is_superuser else "✗"}')
        
        # Check what needs fixing
        needs_fix = []
        if not user.is_active:
            needs_fix.append('User is INACTIVE (cannot login)')
        if not user.is_staff:
            needs_fix.append('User does not have STAFF status (cannot access admin)')
        if not user.is_superuser:
            needs_fix.append('User is not a SUPERUSER (limited permissions)')

        if not needs_fix and not options['password']:
            self.stdout.write(self.style.SUCCESS('\n✓ User account is properly configured for admin access!'))
            self.stdout.write('\nIf you still cannot login, the issue might be:')
            self.stdout.write('  1. Wrong password - use --password option to reset')
            self.stdout.write('  2. CSRF token issue - make sure CSRF_TRUSTED_ORIGINS is set correctly')
            return

        # Fix the issues
        self.stdout.write(self.style.WARNING(f'\n⚠ Found {len(needs_fix)} issue(s):'))
        for issue in needs_fix:
            self.stdout.write(f'  • {issue}')

        # Apply fixes
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.save(update_fields=['is_active', 'is_staff', 'is_superuser'])

        self.stdout.write(self.style.SUCCESS('\n✓ Fixed user account:'))
        self.stdout.write('  • Activated user')
        self.stdout.write('  • Granted staff status')
        self.stdout.write('  • Granted superuser status')

        # Set password if provided
        if options['password']:
            user.set_password(options['password'])
            user.save(update_fields=['password'])
            self.stdout.write(self.style.SUCCESS('  • Password reset'))

        self.stdout.write(self.style.SUCCESS('\n✓ User is now ready for admin login!'))
        self.stdout.write(f'\nYou can now login at: /admin/')
        self.stdout.write(f'  Username: {user.username}')
        if options['password']:
            self.stdout.write(f'  Password: {options["password"]}')

