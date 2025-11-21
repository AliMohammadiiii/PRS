from pathlib import Path
from django.apps import AppConfig


class PeriodsConfig(AppConfig):
    name = "periods"
    verbose_name = "Periods"
    path = str(Path(__file__).resolve().parent)









