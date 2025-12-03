from django.contrib.auth import get_user_model, authenticate
from django.core.management.base import BaseCommand, CommandError
from rest_framework_simplejwt.tokens import RefreshToken


class Command(BaseCommand):
    help = "Test user login authentication to diagnose login issues"

    def add_arguments(self, parser):
        parser.add_argument(
            'username',
            help='Username to test',
        )
        parser.add_argument(
            'password',
            help='Password to test',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']
        password = options['password']

        self.stdout.write(self.style.SUCCESS(f'\nTesting login for user: {username}\n'))

        # Step 1: Check if user exists
        try:
            user = User.objects.get(username=username)
            self.stdout.write(f'✓ User found: {user.username}')
            self.stdout.write(f'  ID: {user.id}')
            self.stdout.write(f'  Active: {"✓" if user.is_active else "✗"}')
            self.stdout.write(f'  Staff: {"✓" if user.is_staff else "✗"}')
            self.stdout.write(f'  Superuser: {"✓" if user.is_superuser else "✗"}')
        except User.DoesNotExist:
            # Try case-insensitive
            users = User.objects.filter(username__iexact=username)
            if users.exists():
                user = users.first()
                self.stdout.write(self.style.WARNING(f'⚠ User found with case-insensitive match: {user.username}'))
                self.stdout.write(f'  ID: {user.id}')
                self.stdout.write(f'  Active: {"✓" if user.is_active else "✗"}')
                self.stdout.write(f'  Staff: {"✓" if user.is_staff else "✗"}')
                self.stdout.write(f'  Superuser: {"✓" if user.is_superuser else "✗"}')
                self.stdout.write(self.style.WARNING(f'\n⚠ Note: Case mismatch! Use username: {user.username}'))
            else:
                raise CommandError(f'User "{username}" does not exist')

        # Step 2: Test Django authentication
        self.stdout.write('\n--- Testing Django authentication ---')
        authenticated_user = authenticate(username=user.username, password=password)
        
        if authenticated_user:
            self.stdout.write(self.style.SUCCESS('✓ Django authentication SUCCESS'))
            self.stdout.write(f'  Authenticated as: {authenticated_user.username}')
        else:
            self.stdout.write(self.style.ERROR('✗ Django authentication FAILED'))
            
            # Check if user is active
            if not user.is_active:
                self.stdout.write(self.style.ERROR('  Reason: User is INACTIVE'))
            
            # Test password directly
            if user.check_password(password):
                self.stdout.write(self.style.WARNING('  Password check: ✓ Correct'))
                if not user.is_active:
                    self.stdout.write(self.style.ERROR('  But user is inactive, so authentication fails'))
            else:
                self.stdout.write(self.style.ERROR('  Reason: Password is INCORRECT'))
                self.stdout.write(self.style.WARNING('  The password you provided does not match'))

        # Step 3: Test case-insensitive authentication
        self.stdout.write('\n--- Testing case-insensitive lookup ---')
        try:
            case_user = User.objects.get(username__iexact=username)
            self.stdout.write(self.style.SUCCESS(f'✓ Case-insensitive lookup found: {case_user.username}'))
            
            if case_user.check_password(password):
                self.stdout.write(self.style.SUCCESS('✓ Password check passed'))
                self.stdout.write(self.style.SUCCESS('✓ Case-insensitive authentication should work'))
            else:
                self.stdout.write(self.style.ERROR('✗ Password check failed'))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('✗ Case-insensitive lookup failed'))

        # Step 4: Test JWT token generation
        if authenticated_user:
            self.stdout.write('\n--- Testing JWT token generation ---')
            try:
                refresh = RefreshToken.for_user(authenticated_user)
                access_token = str(refresh.access_token)
                self.stdout.write(self.style.SUCCESS('✓ JWT token generation SUCCESS'))
                self.stdout.write(f'  Access token length: {len(access_token)} characters')
                self.stdout.write(f'  Refresh token length: {len(str(refresh))} characters')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ JWT token generation FAILED: {e}'))

        # Summary
        self.stdout.write('\n--- Summary ---')
        if authenticated_user:
            self.stdout.write(self.style.SUCCESS('✓ Login should work via API'))
            self.stdout.write(f'  Use username: {user.username}')
            self.stdout.write(f'  Password: {"*" * len(password)}')
        else:
            self.stdout.write(self.style.ERROR('✗ Login will FAIL via API'))
            
            issues = []
            if not user.is_active:
                issues.append('User is inactive - run: python manage.py fix_admin_user {} --activate'.format(user.username))
            if not user.check_password(password):
                issues.append('Password is incorrect - run: python manage.py fix_admin_user {} --password YOUR_PASSWORD'.format(user.username))
            
            if issues:
                self.stdout.write('\n  To fix:')
                for issue in issues:
                    self.stdout.write(f'    • {issue}')


