from pathlib import Path
from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "audit"
    verbose_name = "Audit"
    path = str(Path(__file__).resolve().parent)

    def ready(self):
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Signals module is optional; ignore if not present
            pass
