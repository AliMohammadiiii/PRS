from pathlib import Path
from django.apps import AppConfig


class PrsTeamConfigConfig(AppConfig):
    name = "prs_team_config"
    verbose_name = "PRS Team Configuration"
    path = str(Path(__file__).resolve().parent)











