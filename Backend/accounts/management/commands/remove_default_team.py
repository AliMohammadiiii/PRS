from django.core.management.base import BaseCommand
from teams.models import Team
from purchase_requests.models import PurchaseRequest


class Command(BaseCommand):
    help = "Remove or deactivate the 'Default Team' if it exists"

    def add_arguments(self, parser):
        parser.add_argument(
            '--deactivate',
            action='store_true',
            help='Deactivate the team instead of deleting it',
        )

    def handle(self, *args, **options):
        try:
            team = Team.objects.get(name="Default Team")
            
            # Check if team has active requests
            active_requests = PurchaseRequest.objects.filter(
                team=team,
                is_active=True
            ).exists()
            
            if active_requests:
                self.stdout.write(
                    self.style.WARNING(
                        f"Team '{team.name}' has active purchase requests. "
                        "Deactivating instead of deleting."
                    )
                )
                team.is_active = False
                team.save(update_fields=["is_active"])
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Deactivated team '{team.name}'")
                )
            elif options['deactivate']:
                team.is_active = False
                team.save(update_fields=["is_active"])
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Deactivated team '{team.name}'")
                )
            else:
                # Check for any requests (even inactive ones)
                has_requests = PurchaseRequest.objects.filter(team=team).exists()
                if has_requests:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Team '{team.name}' has purchase request history. "
                            "Deactivating instead of deleting to preserve data."
                        )
                    )
                    team.is_active = False
                    team.save(update_fields=["is_active"])
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Deactivated team '{team.name}'")
                    )
                else:
                    team.delete()
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Deleted team '{team.name}'")
                    )
        except Team.DoesNotExist:
            self.stdout.write(
                self.style.WARNING("No team named 'Default Team' found.")
            )






