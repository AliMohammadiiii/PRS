from pathlib import Path
from django.apps import AppConfig


class RequestsConfig(AppConfig):
    name = "requests"
    verbose_name = "Requests"
    path = str(Path(__file__).resolve().parent)


