from pathlib import Path
from django.apps import AppConfig


class ClassificationsConfig(AppConfig):
    name = "classifications"
    verbose_name = "Classifications"
    path = str(Path(__file__).resolve().parent)









