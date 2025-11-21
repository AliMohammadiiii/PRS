from pathlib import Path
from django.apps import AppConfig


class ReportsConfig(AppConfig):
    name = "reports"
    verbose_name = "Reports"
    path = str(Path(__file__).resolve().parent)









