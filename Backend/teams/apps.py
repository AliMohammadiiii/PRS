from pathlib import Path
from django.apps import AppConfig


class TeamsConfig(AppConfig):
    name = "teams"
    verbose_name = "Teams"
    path = str(Path(__file__).resolve().parent)


