from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q


class Command(BaseCommand):
    help = "Check and fix user account issues for Django admin access"

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            nargs='?',
            help='Username to check or fix (optional - lists all users if not provided)',
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all users with their status',
        )
        parser.add_argument(
            '--activate',
            action='store_true',
            help='Activate the user account',
        )
        parser.add_argument(
            '--deactivate',
            action='store_true',
            help='Deactivate the user account',
        )
        parser.add_argument(
            '--make-staff',
            action='store_true',
            help='Grant staff status (required for admin access)',
        )
        parser.add_argument(
            '--make-superuser',
            action='store_true',
            help='Grant superuser status (full admin access)',
        )
        parser.add_argument(
            '--remove-staff',
            action='store_true',
            help='Remove staff status',
        )
        parser.add_argument(
            '--remove-superuser',
            action='store_true',
            help='Remove superuser status',
        )
        parser.add_argument(
            '--set-password',
            type=str,
            help='Set a new password for the user',
        )
        parser.add_argument(
            '--fix-all',
            action='store_true',
            help='Fix common issues: activate user, make staff, make superuser',
        )

    def handle(self, *args, **options):
        User = get_user_model()

        # List all users if --list is specified or no username provided
        if options['list'] or not options['username']:
            self.list_users(User)
            return

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
                raise CommandError(f'User "{username}" does not exist.')

        # Display current status
        self.show_user_status(user)

        # Apply fixes
        changes_made = False

        if options['fix_all']:
            changes = []
            if not user.is_active:
                user.is_active = True
                changes.append('activated')
            if not user.is_staff:
                user.is_staff = True
                changes.append('made staff')
            if not user.is_superuser:
                user.is_superuser = True
                changes.append('made superuser')
            
            if changes:
                user.save()
                changes_made = True
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Fixed user: {", ".join(changes)}')
                )

        if options['activate']:
            if not user.is_active:
                user.is_active = True
                user.save()
                changes_made = True
                self.stdout.write(self.style.SUCCESS('✓ User activated'))
            else:
                self.stdout.write(self.style.WARNING('User is already active'))

        if options['deactivate']:
            if user.is_active:
                user.is_active = False
                user.save()
                changes_made = True
                self.stdout.write(self.style.SUCCESS('✓ User deactivated'))
            else:
                self.stdout.write(self.style.WARNING('User is already inactive'))

        if options['make_staff']:
            if not user.is_staff:
                user.is_staff = True
                user.save()
                changes_made = True
                self.stdout.write(self.style.SUCCESS('✓ User granted staff status'))
            else:
                self.stdout.write(self.style.WARNING('User already has staff status'))

        if options['make_superuser']:
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True  # Superusers need staff status too
                user.save()
                changes_made = True
                self.stdout.write(
                    self.style.SUCCESS('✓ User granted superuser status (and staff status)')
                )
            else:
                self.stdout.write(self.style.WARNING('User already has superuser status'))

        if options['remove_staff']:
            if user.is_staff:
                user.is_staff = False
                user.save()
                changes_made = True
                self.stdout.write(self.style.SUCCESS('✓ Staff status removed'))
            else:
                self.stdout.write(self.style.WARNING('User does not have staff status'))

        if options['remove_superuser']:
            if user.is_superuser:
                user.is_superuser = False
                user.save()
                changes_made = True
                self.stdout.write(self.style.SUCCESS('✓ Superuser status removed'))
            else:
                self.stdout.write(self.style.WARNING('User does not have superuser status'))

        if options['set_password']:
            password = options['set_password']
            user.set_password(password)
            user.save()
            changes_made = True
            self.stdout.write(self.style.SUCCESS('✓ Password reset'))

        if changes_made:
            self.stdout.write('\nUpdated user status:')
            self.show_user_status(user)

        # Show common issues
        if not changes_made and not any([
            options['activate'], options['deactivate'],
            options['make_staff'], options['make_superuser'],
            options['remove_staff'], options['remove_superuser'],
            options['set_password'], options['fix_all']
        ]):
            self.check_user_issues(user)

    def list_users(self, User):
        """List all users with their status"""
        users = User.objects.all().order_by('username')
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found in database.'))
            return

        self.stdout.write(self.style.SUCCESS(f'\nFound {users.count()} user(s):\n'))
        
        header = f"{'Username':<20} {'Email':<30} {'Active':<8} {'Staff':<8} {'Superuser':<10}"
        self.stdout.write(header)
        self.stdout.write('-' * len(header))

        for user in users:
            active = '✓' if user.is_active else '✗'
            staff = '✓' if user.is_staff else '✗'
            superuser = '✓' if user.is_superuser else '✗'
            
            email = user.email or '(no email)'
            line = f"{user.username:<20} {email:<30} {active:<8} {staff:<8} {superuser:<10}"
            self.stdout.write(line)

        self.stdout.write('\n')

    def show_user_status(self, user):
        """Display current user status"""
        self.stdout.write(self.style.SUCCESS(f'\nUser: {user.username}'))
        self.stdout.write(f'  ID: {user.id}')
        self.stdout.write(f'  Email: {user.email or "(no email)"}')
        self.stdout.write(f'  Active: {"✓ Yes" if user.is_active else "✗ No"}')
        self.stdout.write(f'  Staff: {"✓ Yes" if user.is_staff else "✗ No"}')
        self.stdout.write(f'  Superuser: {"✓ Yes" if user.is_superuser else "✗ No"}')
        self.stdout.write(f'  Last login: {user.last_login or "Never"}')
        self.stdout.write('')

    def check_user_issues(self, user):
        """Check for common issues that prevent admin login"""
        issues = []
        fixes = []

        if not user.is_active:
            issues.append('User account is INACTIVE')
            fixes.append('Run: python manage.py fix_user <username> --activate')

        if not user.is_staff:
            issues.append('User does not have STAFF status (required for admin access)')
            fixes.append('Run: python manage.py fix_user <username> --make-staff')

        if not user.is_superuser:
            issues.append('User is not a SUPERUSER (limited admin access)')
            fixes.append('Run: python manage.py fix_user <username> --make-superuser')

        if issues:
            self.stdout.write(self.style.ERROR('\n⚠ Issues found that may prevent admin login:'))
            for issue in issues:
                self.stdout.write(f'  • {issue}')
            
            self.stdout.write(self.style.SUCCESS('\n💡 To fix all issues at once:'))
            self.stdout.write(f'  python manage.py fix_user {user.username} --fix-all')
            
            self.stdout.write(self.style.SUCCESS('\nOr fix individually:'))
            for fix in fixes:
                self.stdout.write(f'  • {fix}')
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    '\n✓ User account looks good! If login still fails, check the password.'
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    '  To reset password: python manage.py fix_user <username> --set-password <new_password>'
                )
            )



