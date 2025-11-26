from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Create three test users (requester_user, approver_user, admin_user) "
        "all with password '1', and attach basic PRS roles."
    )

    def handle(self, *args, **options):
        User = get_user_model()

        # Local imports so Django is fully initialised
        from classifications.models import LookupType, Lookup
        from teams.models import Team
        from accounts.models import AccessScope

        users_to_create = [
            {"username": "requester_user", "email": "requester_user@example.com"},
            {"username": "approver_user", "email": "approver_user@example.com"},
            {"username": "admin_user", "email": "admin_user@example.com"},
        ]

        # Get the first active team (or create one if none exists, but not "Default Team")
        # Note: Teams should be created separately via admin or other management commands
        team = Team.objects.filter(is_active=True).first()
        if not team:
            self.stdout.write(
                self.style.ERROR(
                    "No active teams found. Please create at least one team before running this command."
                )
            )
            return

        # Ensure we have a ROLE lookup type and basic roles
        role_type, _ = LookupType.objects.get_or_create(
            code="ROLE",
            defaults={"title": "User Roles"},
        )

        requester_role, _ = Lookup.objects.get_or_create(
            type=role_type,
            code="REQUESTER",
            defaults={"title": "Requester"},
        )
        approver_role, _ = Lookup.objects.get_or_create(
            type=role_type,
            code="APPROVER",
            defaults={"title": "Approver"},
        )
        admin_role, _ = Lookup.objects.get_or_create(
            type=role_type,
            code="ADMIN",
            defaults={"title": "Admin"},
        )

        role_map = {
            "requester_user": requester_role,
            "approver_user": approver_role,
            "admin_user": admin_role,
        }

        for data in users_to_create:
            username = data["username"]
            email = data["email"]

            user, created = User.objects.get_or_create(
                username=username,
                defaults={"email": email},
            )

            # Always reset password to '1' for test convenience
            user.set_password("1")

            # Ensure staff/admin flags are reasonable defaults
            if username == "admin_user":
                user.is_staff = True
                user.is_superuser = True

            user.save()

            # Attach (or reactivate) an AccessScope with the correct role
            role = role_map[username]
            scope, scope_created = AccessScope.objects.get_or_create(
                user=user,
                team=team,
                role=role,
                defaults={"position_title": ""},
            )
            if not scope.is_active:
                scope.is_active = True
                scope.save(update_fields=["is_active", "updated_at"])

            if created:
                self.stdout.write(self.style.SUCCESS(f"✓ Created user '{username}' with password '1'"))
            else:
                self.stdout.write(self.style.WARNING(f"• Updated existing user '{username}' password to '1'"))

            if scope_created:
                self.stdout.write(self.style.SUCCESS(f"  ↳ Added {role.code} role on team '{team.name}'"))
            else:
                self.stdout.write(self.style.WARNING(f"  ↳ Ensured {role.code} role on team '{team.name}' is active"))

        self.stdout.write(self.style.SUCCESS("✓ Test users and roles are ready."))


