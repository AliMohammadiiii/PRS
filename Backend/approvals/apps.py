from pathlib import Path
from django.apps import AppConfig


class ApprovalsConfig(AppConfig):
    name = "approvals"
    verbose_name = "Approvals"
    path = str(Path(__file__).resolve().parent)


