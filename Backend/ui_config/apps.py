from pathlib import Path
from django.apps import AppConfig


class UiConfigConfig(AppConfig):
    name = "ui_config"
    verbose_name = "UI Configuration"
    path = str(Path(__file__).resolve().parent)





