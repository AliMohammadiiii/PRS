from pathlib import Path
from django.apps import AppConfig


class SubmissionsConfig(AppConfig):
    name = "submissions"
    verbose_name = "Submissions"
    path = str(Path(__file__).resolve().parent)









