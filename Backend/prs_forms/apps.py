from pathlib import Path
from django.apps import AppConfig


class PrsFormsConfig(AppConfig):
    name = "prs_forms"
    verbose_name = "PRS Forms"
    path = str(Path(__file__).resolve().parent)

