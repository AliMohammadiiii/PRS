from pathlib import Path
from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "core"
    verbose_name = "Core"
    path = str(Path(__file__).resolve().parent)









