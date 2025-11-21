from pathlib import Path
from django.apps import AppConfig


class OrgConfig(AppConfig):
    name = "org"
    verbose_name = "Org"
    path = str(Path(__file__).resolve().parent)









