from pathlib import Path
from django.apps import AppConfig


class FormsConfig(AppConfig):
    name = "forms"
    verbose_name = "Forms"
    path = str(Path(__file__).resolve().parent)


